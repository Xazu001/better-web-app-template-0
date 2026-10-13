/**
 * `pnpm bootstrap` — bootstraps a new project from this template.
 * (Named `bootstrap`, not `setup` — `setup` is a pnpm builtin command and would be shadowed.)
 * npm works too: `npm run bootstrap` — all invoked scripts go through the detected
 * package manager (`npm_config_user_agent`).
 *
 *   1. `pnpm install` (skipped when node_modules exists)
 *   2. `wrangler.example.jsonc` → `wrangler.jsonc` (skipped when it exists)
 *   3. `.dev.vars.example` → `.dev.vars` + generated JWT keypair (skipped when keys exist)
 *   4. `pnpm typegen` (wrangler types + react-router typegen)
 *   5. `pnpm db:generate` (Drizzle → drizzle/*.sql)
 *   6. `pnpm db:migrate:local` (local emulated D1)
 *
 *
 * Idempotent — safe to re-run. State check anytime: `pnpm check:setup`.
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { parse as parseJsonc } from "jsonc-parser";

import { writeJwtKeys } from "./gen-keys";
import { jwtPairState, withLocalPrivApiKey } from "./lib/dev-vars";

const PLACEHOLDER_ID = /^0{8}-0{4}-0{4}-0{4}-0{12}$|^0{32}$/;

const run = (cmd: string): void => {
  execSync(cmd, { stdio: "inherit" });
};
const step = (msg: string): void => console.log(`\n▸ ${msg}`);
const ok = (msg: string): void => console.log(`  ✓ ${msg}`);
for (const arg of process.argv.slice(2)) {
  if (arg === "--") continue;
  console.error(
    `\`pnpm bootstrap\` is local-only — unexpected argument "${arg}". ` +
      "Provision remote resources explicitly with `pnpm cf:setup` / `pnpm cf:setup:prod` — never via bootstrap."
  );
  process.exit(1);
}

// npm or pnpm — whichever invoked this script (`npm_config_user_agent` is set by both
// when running scripts, e.g. "npm/11.2.4 node/v22…" or "pnpm/12.5.1 npm/10.9.2 …").
const pm = process.env.npm_config_user_agent?.startsWith("npm/") ? "npm" : "pnpm";

// 1. Dependencies
if (existsSync("node_modules")) ok("dependencies installed (node_modules present)");
else {
  step("installing dependencies");
  run(`${pm} install`);
}

// 2. Wrangler config
if (existsSync("wrangler.jsonc")) ok("wrangler.jsonc already exists");
else {
  copyFileSync("wrangler.example.jsonc", "wrangler.jsonc");
  ok("copied wrangler.example.jsonc → wrangler.jsonc");
}

// 3. Local secrets + JWT keypair
if (!existsSync(".dev.vars")) {
  copyFileSync(".dev.vars.example", ".dev.vars");
  ok("copied .dev.vars.example → .dev.vars");
}
const devVars = parseEnv(readFileSync(".dev.vars", "utf8"));
const pairState = jwtPairState(devVars);
if (pairState === "missing-private" || pairState === "missing-public") {
  console.error(
    ".dev.vars has only half of the JWT keypair — remove the orphan line, " +
      `then run \`${pm} run gen:keys\` to regenerate the pair.`
  );
  process.exit(1);
}
if (pairState === "ok") {
  ok("JWT keys already present in .dev.vars");
} else {
  step("generating JWT keypair into .dev.vars");
  writeJwtKeys();
}
const privContent = readFileSync(".dev.vars", "utf8");
const privNext = withLocalPrivApiKey(privContent, parseEnv(privContent));
if (privNext !== null) {
  writeFileSync(".dev.vars", privNext);
  ok("generated a local PRIV_API_KEY in .dev.vars");
}
if (!existsSync(".dev.vars.prod")) {
  copyFileSync(".dev.vars", ".dev.vars.prod");
  ok("initialized .dev.vars.prod as a copy of .dev.vars");
}
if (!existsSync(".env") && existsSync(".env.example")) {
  copyFileSync(".env.example", ".env");
  populateEnvIds();
  ok("copied .env.example → .env (optional tooling credentials)");
}

// 4–6. Types + database
step("generating types (wrangler types + react-router typegen)");
run(`${pm} run typegen`);
step("generating D1 migrations from Drizzle schema");
run(`${pm} run db:generate`);
step("applying migrations to local D1");
run(`${pm} run db:migrate:local`);

printNextSteps();

function populateEnvIds(): void {
  const config = parseJsonc(readFileSync("wrangler.jsonc", "utf8")) as {
    account_id?: string;
    env?: Record<
      string,
      { d1_databases?: { binding: string; database_id: string }[] }
    >;
  };
  const ownedDb = (envName: "dev" | "prod") =>
    config.env?.[envName]?.d1_databases?.find((d) => d.binding === "db");
  const env = parseEnv(readFileSync(".env", "utf8"));
  let out = readFileSync(".env", "utf8");
  const fill = (key: string, value: string | undefined) => {
    if (!value || PLACEHOLDER_ID.test(value) || env[key]) return;
    out = out.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
  };
  fill("CLOUDFLARE_ACCOUNT_ID", config.account_id);
  fill("CLOUDFLARE_DB_ID", ownedDb("dev")?.database_id);
  fill("CLOUDFLARE_DB_PROD_ID", ownedDb("prod")?.database_id);
  writeFileSync(".env", out);
}

function printNextSteps(): void {
  console.log(`
──────────────────────────────────────────────────────────────
Setup complete. Remaining manual steps:

1. Update shared/constants/site.ts — domains, brand, contact email.
2. Set deploy secrets (values may differ from local .dev.vars):
     wrangler secret put JWT_PRIVATE_KEY
     wrangler secret put JWT_PUBLIC_KEY
     wrangler secret put PRIV_API_KEY
3. Remote resources (when needed): ${pm} run cf:setup — offline plan by
   default, \`--apply\` provisions only after explicit account confirmation.
4. Create an admin: register in the app, then flip user_rights.user_admin
   (exact command: AGENTS.md § Setup, step 8).

Verify anytime: ${pm} run check:setup
──────────────────────────────────────────────────────────────`);
}

