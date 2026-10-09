/**
 * `pnpm check:setup` — read-only health check of the template setup state.
 *
 * FAIL = local dev is broken (fix before `pnpm dev`).
 * WARN = only needed for remote dev/prod (deploy, dev:wrangler).
 * `--strict` — treat warnings as failures (useful before deploying).
 *
 * Exit code: 0 = all good, 1 = failures (or warnings with --strict).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";

type CheckStatus = "ok" | "warn" | "FAIL";

interface CheckResult {
  name: string;
  status: CheckStatus;
  hint: string | null;
}

const strict = process.argv.includes("--strict");
const results: CheckResult[] = [];

function check(name: string, status: CheckStatus, hint: string | null = null): void {
  results.push({ name, status, hint });
}

const failIf = (bad: boolean, name: string, hint: string): void =>
  check(name, bad ? "FAIL" : "ok", bad ? hint : null);

// 1. Dependencies
failIf(
  !existsSync("node_modules"),
  "Dependencies installed",
  "run `pnpm install` (or `pnpm bootstrap`)"
);

// 2. Wrangler config
failIf(
  !existsSync("wrangler.jsonc"),
  "wrangler.jsonc exists",
  "run `cp wrangler.example.jsonc wrangler.jsonc` (or `pnpm bootstrap`)"
);

// 3. Local secrets + JWT keys
const devVars = existsSync(".dev.vars") ? readFileSync(".dev.vars", "utf8") : "";
failIf(
  !existsSync(".dev.vars"),
  ".dev.vars exists",
  "run `cp .dev.vars.example .dev.vars` (or `pnpm bootstrap`)"
);
failIf(
  !/^JWT_PRIVATE_KEY=\S/m.test(devVars) || !/^JWT_PUBLIC_KEY=\S/m.test(devVars),
  "JWT keypair in .dev.vars",
  "run `pnpm gen:keys`"
);

// 4. Migrations generated from Drizzle schema
const hasMigrations =
  existsSync("drizzle") && readdirSync("drizzle").some((f) => f.endsWith(".sql"));
failIf(!hasMigrations, "D1 migrations generated", "run `pnpm db:generate`");

// 5. Local D1 state (migrations applied to the emulated database)
failIf(!existsSync(".wrangler/state/v3/d1"), "Local D1 migrated", "run `pnpm db:migrate:local`");

// 6. Generated types (postinstall normally creates these)
failIf(!existsSync("worker-configuration.d.ts"), "Worker types generated", "run `pnpm typegen`");

// --- warnings: only relevant for remote dev/prod ---------------------------
const config = existsSync("wrangler.jsonc") ? readFileSync("wrangler.jsonc", "utf8") : "";
if (
  config.includes("00000000-0000-0000-0000-000000000000") ||
  config.includes("00000000000000000000000000000000")
) {
  check(
    "Real resource IDs in wrangler.jsonc",
    "warn",
    "placeholder IDs remain — needed for `dev:wrangler`/deploy (`pnpm bootstrap --remote` or manual)"
  );
}
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
  existsSync("wrangler.jsonc") &&
  !readFileSync("wrangler.jsonc", "utf8").includes('"RATE_LIMITER"')
) {
  check(
    "RATE_LIMITER Durable Object binding in wrangler.jsonc",
    "warn",
    "binding missing — rate limiting is a no-op; copy it from wrangler.example.jsonc (bindings + migrations)"
  );
}
const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
if (!/^CLOUDFLARE_ACCOUNT_ID=\S/m.test(env)) {
  check(
    "CLOUDFLARE_ACCOUNT_ID in .env",
    "warn",
    "needed for remote drizzle-kit/wrangler ops (deploy, db:migrate)"
  );
}

// --- report -----------------------------------------------------------------
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
  `\ndoctor: ${results.length - warned.length - failed.length} ok, ${warned.length} warning(s) — ${strict ? "strict mode" : "local dev ready"}`
);
