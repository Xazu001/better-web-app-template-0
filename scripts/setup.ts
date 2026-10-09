/**
 * `pnpm bootstrap` — bootstraps a new project from this template.
 * (Named `bootstrap`, not `setup` — `setup` is a pnpm builtin command and would be shadowed.)
 * npm works too: `npm run bootstrap` — all invoked scripts go through the detected
 * package manager (`npm_config_user_agent`).
 *
 * Local (default — no Cloudflare credentials needed):
 *   1. `pnpm install` (skipped when node_modules exists)
 *   2. `wrangler.example.jsonc` → `wrangler.jsonc` (skipped when it exists)
 *   3. `.dev.vars.example` → `.dev.vars` + generated JWT keypair (skipped when keys exist)
 *   4. `pnpm typegen` (wrangler types + react-router typegen)
 *   5. `pnpm db:generate` (Drizzle → drizzle/*.sql)
 *   6. `pnpm db:migrate:local` (local emulated D1)
 *
 * Remote (`--remote` — needs wrangler auth or CLOUDFLARE_ACCOUNT_ID in .env):
 *   creates D1/R2/KV/Queues for dev+prod, patches real IDs into wrangler.jsonc
 *   (backup written to wrangler.jsonc.bak), applies remote dev migrations.
 *
 * Idempotent — safe to re-run. State check anytime: `pnpm check:setup`.
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

import { writeJwtKeys } from "./gen-keys";
import { applyWranglerIds } from "./lib/patch-wrangler";

const run = (cmd: string): void => {
  execSync(cmd, { stdio: "inherit" });
};
const capture = (cmd: string): string => execSync(cmd, { encoding: "utf8" });
const step = (msg: string): void => console.log(`\n▸ ${msg}`);
const ok = (msg: string): void => console.log(`  ✓ ${msg}`);
const warn = (msg: string): void => console.log(`  ! ${msg}`);
const remote = process.argv.includes("--remote");

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
if (/^JWT_PRIVATE_KEY=\S/m.test(readFileSync(".dev.vars", "utf8"))) {
  ok("JWT keys already present in .dev.vars");
} else {
  step("generating JWT keypair into .dev.vars");
  writeJwtKeys();
}

// 4–6. Types + database
step("generating types (wrangler types + react-router typegen)");
run(`${pm} run typegen`);
step("generating D1 migrations from Drizzle schema");
run(`${pm} run db:generate`);
step("applying migrations to local D1");
run(`${pm} run db:migrate:local`);

// 7. Remote resources (opt-in — creates real Cloudflare resources)
if (remote) await setupRemote();

printNextSteps(remote);

async function setupRemote(): Promise<void> {
  step("remote setup — this creates real Cloudflare resources (D1, R2, KV, Queues)");

  if (!/^CLOUDFLARE_ACCOUNT_ID=\S/m.test(existsSync(".env") ? readFileSync(".env", "utf8") : "")) {
    warn(
      "CLOUDFLARE_ACCOUNT_ID not found in .env — wrangler must be authenticated (`wrangler login` or .env)"
    );
  }

  const answer = await createInterface({
    input: process.stdin,
    output: process.stdout
  }).question("Create remote resources now? [y/N] ");
  if (answer.trim().toLowerCase() !== "y") {
    warn(`skipped remote setup — run \`${pm} run bootstrap --remote\` later`);
    return;
  }

  const config = readFileSync("wrangler.jsonc", "utf8");
  const uniq = (matches: RegExpMatchArray[]): string[] => [...new Set(matches.map((m) => m[1]))];
  const d1Names = uniq([...config.matchAll(/"database_name":\s*"([^"]+)"/g)]);
  const r2Names = uniq([...config.matchAll(/"bucket_name":\s*"([^"]+)"/g)]);
  const queueNames = uniq([...config.matchAll(/"(?:queue|dead_letter_queue)":\s*"([^"]+)"/g)]);

  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const hex32Re = /\b[0-9a-f]{32}\b/i;
  const findId = (out: string, re: RegExp, label: string): string | null => {
    const id = out.match(re)?.[0];
    if (!id) {
      warn(`could not parse ${label} from wrangler output — paste it into wrangler.jsonc manually`);
    }
    return id ?? null;
  };

  // D1 — first unique name is dev, second is prod (file order: top, env.dev, env.prod)
  const d1Ids: Record<string, string | null> = {};
  for (const name of d1Names) {
    step(`creating D1 database "${name}"`);
    d1Ids[name] = findId(capture(`wrangler d1 create ${name}`), uuidRe, `D1 id for ${name}`);
  }

  // R2 — bucket names only, no IDs in config
  for (const name of r2Names) {
    step(`creating R2 bucket "${name}"`);
    run(`wrangler r2 bucket create ${name}`);
  }

  // KV — one namespace per env; top-level + env.dev share the dev namespace
  const kvIds: Record<string, string | null> = {};
  for (const envName of ["dev", "prod"]) {
    step(`creating KV namespace for ${envName}`);
    const out = capture(`wrangler kv namespace create ${envName}`);
    kvIds[envName] = findId(out, hex32Re, `KV id for ${envName}`);
  }

  // Queues — names only (producers + DLQs)
  for (const name of queueNames) {
    step(`creating queue "${name}"`);
    run(`wrangler queues create ${name}`);
  }

  // Patch real IDs into wrangler.jsonc (backup first) — AST-based, so the
  // commented-out `account_id` placeholder and all comments survive.
  const patched = applyWranglerIds(config, {
    d1: d1Ids,
    kv: { dev: kvIds.dev, prod: kvIds.prod }
  });
  if (patched !== config) {
    copyFileSync("wrangler.jsonc", "wrangler.jsonc.bak");
    writeFileSync("wrangler.jsonc", patched);
    ok("patched resource IDs into wrangler.jsonc (backup: wrangler.jsonc.bak)");
  }

  step("applying migrations to remote dev D1");
  run(`${pm} run db:migrate`);
}

function printNextSteps(remoteDone: boolean): void {
  console.log(`
──────────────────────────────────────────────────────────────
Setup complete. Remaining manual steps:

1. Update shared/constants/site.ts — domains, brand, contact email.
2. Set deploy secrets (values may differ from local .dev.vars):
     wrangler secret put JWT_PRIVATE_KEY
     wrangler secret put JWT_PUBLIC_KEY
     wrangler secret put PRIV_API_KEY
${remoteDone ? `3. Prod migrations when ready: ${pm} run db:migrate:prod` : `3. Remote resources (when needed): ${pm} run bootstrap --remote`}
4. Create an admin: register in the app, then flip user_rights.user_admin
   (exact command: AGENTS.md § Setup, step 8).

Verify anytime: ${pm} run check:setup
──────────────────────────────────────────────────────────────`);
}
