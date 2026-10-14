/**
 *
 * `--strict` — treat warnings as failures (useful before deploying).
 *
 * Exit code: 0 = all good, 1 = failures (or warnings with --strict).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { parse as parseJsonc, type ParseError } from "jsonc-parser";

type CheckStatus = "ok" | "warn" | "FAIL";

interface CheckResult {
  name: string;
  status: CheckStatus;
  hint: string | null;
}

const strict = process.argv.includes("--strict");
const results: CheckResult[] = [];

// npm or pnpm — whichever invoked this script (`npm_config_user_agent` is set by both).
const pm = process.env.npm_config_user_agent?.startsWith("npm/") ? "npm" : "pnpm";

function check(name: string, status: CheckStatus, hint: string | null = null): void {
  results.push({ name, status, hint });
}

const failIf = (bad: boolean, name: string, hint: string): void =>
  check(name, bad ? "FAIL" : "ok", bad ? hint : null);

const envArgIndex = process.argv.indexOf("--env");
if (envArgIndex !== -1 && !process.argv[envArgIndex + 1]) {
  console.error("doctor: --env requires a value (local, dev or prod)");
  process.exit(1);
}
const selectedEnv = envArgIndex !== -1 ? process.argv[envArgIndex + 1] : "local";
if (!["local", "dev", "prod"].includes(selectedEnv)) {
  console.error(`doctor: invalid --env "${selectedEnv}" — expected local, dev or prod`);
  process.exit(1);
}
const remoteEnv = selectedEnv === "dev" || selectedEnv === "prod" ? selectedEnv : null;

const PLACEHOLDER_ID = /^0{8}-0{4}-0{4}-0{4}-0{12}$|^0{32}$/;
const ID_RE = /^[0-9a-f-]{32,36}$/i;
const wranglerConfig = (() => {
  if (!existsSync("wrangler.jsonc")) return undefined;
  const errors: ParseError[] = [];
  const cfg = parseJsonc(readFileSync("wrangler.jsonc", "utf8"), errors) as
    | Record<string, unknown>
    | undefined;
  return errors.length > 0 ? null : cfg;
})();

failIf(
  !existsSync("node_modules"),
  "Dependencies installed",
  `run \`${pm} install\` (or \`${pm} run bootstrap\`)`
);
failIf(
  wranglerConfig === undefined,
  "wrangler.jsonc exists",
  `run \`cp wrangler.example.jsonc wrangler.jsonc\` (or \`${pm} run bootstrap\`)`
);
failIf(
  wranglerConfig === null,
  "wrangler.jsonc parses",
  "wrangler.jsonc has JSONC parse errors — fix before anything else"
);

if (selectedEnv === "local") {
  const devVarsText = existsSync(".dev.vars") ? readFileSync(".dev.vars", "utf8") : "";
  const devVars = existsSync(".dev.vars") ? parseEnv(devVarsText) : {};
  failIf(
    !existsSync(".dev.vars"),
    ".dev.vars exists",
    `run \`${pm} run env:init\` (or \`${pm} run bootstrap\`)`
  );
  failIf(
    !devVars.JWT_PRIVATE_KEY || !devVars.JWT_PUBLIC_KEY,
    "JWT keypair in .dev.vars",
    `run \`${pm} run gen:keys\``
  );
  failIf(
    !existsSync("drizzle") || !readdirSync("drizzle").some((f) => f.endsWith(".sql")),
    "D1 migrations generated",
    `run \`${pm} run db:generate\``
  );
  failIf(
    !existsSync(".wrangler/state/v3/d1"),
    "Local D1 state exists",
    `local migrations not yet applied — run \`${pm} run db:migrate:local\``
  );
  failIf(
    !existsSync("worker-configuration.d.ts"),
    "Worker types generated",
    `run \`${pm} run typegen\``
  );
  if (
    existsSync("shared/constants/site.ts") &&
    readFileSync("shared/constants/site.ts", "utf8").includes("example.com")
  ) {
    check(
      "site.ts domains updated",
      "warn",
      "example.com placeholders remain in shared/constants/site.ts — update before deploying"
    );
  }
  if (
    typeof wranglerConfig === "object" &&
    wranglerConfig !== null &&
    !JSON.stringify(wranglerConfig).includes('"RATE_LIMITER"')
  ) {
    check(
      "RATE_LIMITER Durable Object binding in wrangler.jsonc",
      "warn",
      "binding missing — rate limiting is a no-op; copy it from wrangler.example.jsonc (bindings + migrations)"
    );
  }
}

if (remoteEnv && wranglerConfig && typeof wranglerConfig === "object") {
  const envCfg = (wranglerConfig.env as Record<string, unknown> | undefined)?.[remoteEnv] as
    | Record<string, unknown>
    | undefined;
  const secretsFile = remoteEnv === "prod" ? ".dev.vars.prod" : ".dev.vars";
  if (!envCfg) {
    check(`wrangler.jsonc env.${remoteEnv} defined`, "FAIL", `no env.${remoteEnv} block found`);
  } else {
    const ownedD1 = (
      (envCfg.d1_databases as { binding?: string; database_id?: string }[]) ?? []
    ).filter((d) => d.binding === "db");
    const kv = (envCfg.kv_namespaces as { binding?: string; id?: string }[]) ?? [];
    const problems: string[] = [];
    for (const d of ownedD1) {
      if (!d.database_id || PLACEHOLDER_ID.test(d.database_id)) {
        problems.push(`d1:${d.binding} placeholder/missing id`);
      } else if (!ID_RE.test(d.database_id)) {
        problems.push(`d1:${d.binding} malformed id`);
      }
    }
    for (const k of kv) {
      if (!k.id || PLACEHOLDER_ID.test(k.id)) {
        problems.push(`kv:${k.binding} placeholder/missing id`);
      } else if (!ID_RE.test(k.id)) {
        problems.push(`kv:${k.binding} malformed id`);
      }
    }
    check(
      `Real resource IDs in wrangler.jsonc env.${remoteEnv}`,
      problems.length === 0 ? "ok" : "warn",
      problems.length === 0
        ? null
        : `${problems.join(", ")} — provision with \`${pm} run cf:setup\` or set real resource IDs manually`
    );
  }
  const requiredSecrets = (envCfg?.secrets as { required?: string[] } | undefined)?.required ??
    (wranglerConfig.secrets as { required?: string[] } | undefined)?.required ?? [
      "JWT_PRIVATE_KEY",
      "JWT_PUBLIC_KEY",
      "PRIV_API_KEY"
    ];
  const secrets = existsSync(secretsFile) ? parseEnv(readFileSync(secretsFile, "utf8")) : {};
  const missing = requiredSecrets.filter((k) => !secrets[k]);
  check(
    `Required secrets present in ${secretsFile}`,
    missing.length === 0 ? "ok" : "warn",
    missing.length === 0
      ? null
      : `missing: ${missing.join(", ")} — ${secretsFile} backs \`pnpm dev${remoteEnv === "prod" ? ":prod" : ""}\` local serves only; deployed secrets are set via \`wrangler secret put\` and are not verified here`
  );
  const ownedDbEntry = (
    (envCfg?.d1_databases as { binding?: string; migrations_dir?: string }[]) ?? []
  ).find((d) => d.binding === "db");
  const migDir =
    ownedDbEntry?.migrations_dir ??
    ((wranglerConfig.d1_databases as { binding?: string; migrations_dir?: string }[]) ?? []).find(
      (d) => d.binding === "db"
    )?.migrations_dir;
  check(
    `env.${remoteEnv} migrations_dir exists`,
    migDir && existsSync(migDir) ? "ok" : "warn",
    `expected ${migDir ?? "(unset)"} — prod uses the separate drizzle-prod history; generate via \`${pm} run db:generate${remoteEnv === "prod" ? ":prod" : ""}\``
  );
  const dotEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ??
    dotEnv.CLOUDFLARE_ACCOUNT_ID ??
    (envCfg?.account_id as string | undefined) ??
    (wranglerConfig.account_id as string | undefined);
  check(
    "Cloudflare account ID configured",
    accountId && /^[0-9a-f]{32}$/i.test(accountId) ? "ok" : "warn",
    `needed for remote ops (deploy, db:migrate, cf:setup) — set account_id in wrangler.jsonc env.${remoteEnv}, CLOUDFLARE_ACCOUNT_ID in .env, or pass --account-id`
  );
}

const icon: Record<CheckStatus, string> = { ok: "✓", warn: "!", FAIL: "✗" };
for (const { name, status, hint } of results) {
  const line = `  [${icon[status]}] ${name}`;
  console.log(hint ? `${line} — ${hint}` : line);
}

const failed = results.filter((r) => r.status === "FAIL");
const warned = results.filter((r) => r.status === "warn");
if (failed.length > 0 || (strict && warned.length > 0)) {
  console.error(
    `\ndoctor: ${failed.length} failure(s)${strict ? ` + ${warned.length} warning(s) in --strict` : ""}`
  );
  process.exit(1);
}
console.log(
  `\ndoctor: ${results.length - warned.length - failed.length} ok, ${warned.length} warning(s) — ${strict ? "strict mode" : remoteEnv ? `env.${remoteEnv} checked (static)` : "local dev ready"}`
);
