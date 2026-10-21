/**
 * `pnpm bootstrap` — bootstraps a new project from this template.
 * (Named `bootstrap`, not `setup` — `setup` is a pnpm builtin command and would be shadowed.)
 * npm works too: `npm run bootstrap` — all invoked scripts go through the detected
 * package manager (`npm_config_user_agent`).
 *
 *   1. `pnpm install` (skipped when node_modules exists)
 *   2. `wrangler.example.jsonc` → `wrangler.jsonc` (skipped when it exists)
 *   3. `pnpm env:init` creates `.dev.vars` and `.env`
 *   4. `pnpm typegen` (wrangler types + react-router typegen)
 *   5. `pnpm db:generate` (Drizzle → drizzle/*.sql)
 *   6. `pnpm db:migrate:local` (local emulated D1)
 *
 *
 * Idempotent — safe to re-run. State check anytime: `pnpm check:setup`.
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

import { initEnvFiles } from "./env-init";

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

// 3. Local env files (.dev.vars + .env — remote env files are opt-in via
//    `pnpm env:init --env dev|prod`, never part of bootstrap)
initEnvFiles({ log: ok });

// 4–6. Types + database
step("generating types (wrangler types + react-router typegen)");
run(`${pm} run typegen`);
step("generating D1 migrations from Drizzle schema");
run(`${pm} run db:generate`);
step("applying migrations to local D1");
run(`${pm} run db:migrate:local`);

printNextSteps();

function printNextSteps(): void {
  console.log(`
──────────────────────────────────────────────────────────────
Setup complete. Remaining manual steps:

1. Update shared/constants/site.ts — domains, brand, contact email.
   Local env files were created or updated by \`${pm} env:init\`.
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
