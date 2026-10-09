# better-web-app-template

A production-grade full-stack web app template for Cloudflare Workers, built around the
conventions from the Crosspad codebase: **Hono + React Router v8 SSR in one Worker**, a
service-layer server architecture, an MD3/Tailwind v4 design system, and a complete
agent ruleset (`.agents/`) that keeps generated code consistent.

## Requirements

| Requirement         | Version                                                                            | Notes                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js             | **≥ 22** (22 LTS or 24 recommended — CI runs 24)                                   | Vite 8 needs ≥ 20.19, wrangler 4 needs ≥ 22 — so 22 is the practical floor                                                                                                                  |
| npm **or** pnpm     | pnpm **12.5.1** pinned via `packageManager` (npm ships with Node)                  | every script is package-manager agnostic — `npm run <script>` ≡ `pnpm <script>`; docs use the `pnpm` shorthand. With corepack enabled the pin forces pnpm — don't enable it if you want npm |
| Git                 | any recent version                                                                 | branching model in [Branching & Git workflow](#branching--git-workflow)                                                                                                                     |
| Cloudflare account  | free plan is enough — **except the email system, which needs a paid plan**         | **not needed for local dev** — every binding (D1, R2, KV, Queues, DO, email) is emulated locally. Needed only for `pnpm bootstrap --remote` and deploys                                     |
| Cloudflare auth     | `wrangler login` **or** `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` in `.env` | required for remote resources, migrations against remote D1, `wrangler secret put` — [token scopes](#cloudflare_api_token-scopes)                                                           |
| Email Routing       | **paid plan required** + verified domain on your Cloudflare account                | the only part that needs a paid plan — everything else works on the free plan; locally, preview templates at `/api/mail-previews`                                                           |
| Playwright Chromium | `pnpm exec playwright install --with-deps chromium`                                | only for `pnpm test:e2e`                                                                                                                                                                    |

**Machine-local files are never committed** (all gitignored): `wrangler.jsonc`, `.dev.vars`,
`.env`, `worker-configuration.d.ts`, `.build/`, `.wrangler/`. Every fresh clone regenerates
them via `pnpm bootstrap` — never copy secrets between machines through the repo.

## Setup

```bash
npm install                      # or: pnpm install (first — bootstrap itself runs via tsx, a devDependency)
npm run bootstrap                # or: pnpm bootstrap — wrangler.jsonc + .dev.vars + JWT keys + local D1, idempotent
npm run dev                      # or: pnpm dev → http://localhost:5173 — all bindings run locally
```

Both package managers work here: every script is package-manager agnostic
(`npm run <script>` ≡ `pnpm <script>`) and `bootstrap`/`check:setup` detect which one
invoked them. The rest of this README uses the `pnpm` shorthand.

`pnpm bootstrap` bootstraps a fresh copy of the template (idempotent — safe to re-run):

1. `pnpm install` — skipped when `node_modules` exists.
2. Copies `wrangler.example.jsonc` → `wrangler.jsonc` — skipped when it exists.
3. Copies `.dev.vars.example` → `.dev.vars` and generates a JWT keypair into it
   (skipped when keys are already set — never regenerates over existing keys).
4. `pnpm typegen` → `pnpm db:generate` → `pnpm db:migrate:local`.

With `--remote` it additionally (after an explicit `[y/N]` confirm) creates the real
Cloudflare resources for dev+prod (`wrangler d1 create`, `r2 bucket create`,
`kv namespace create`, `queues create`), patches the returned IDs into
`wrangler.jsonc` (backup in `wrangler.jsonc.bak`) and applies remote dev migrations.
Requires wrangler auth (`wrangler login`) or `CLOUDFLARE_ACCOUNT_ID` in `.env`.

Manual equivalent of `pnpm bootstrap`:

```bash
cp .dev.vars.example .dev.vars && pnpm gen:keys   # generates a local JWT keypair into .dev.vars
pnpm typegen                     # wrangler types + react-router typegen
pnpm db:generate                 # drizzle-kit → drizzle/*.sql from server/database/schema.ts
pnpm db:migrate:local            # apply migrations to the local (emulated) D1
```

**`.dev.vars` vs `.env`** — different runtimes, never mix them:

- `.dev.vars` — Worker runtime secrets (`JWT_*`, `PRIV_API_KEY`). Wrangler injects them
  into `env` during local dev; the deployed equivalent is `wrangler secret put`.
- `.env` — **never read by the Worker.** For Node tooling only (`drizzle-kit` d1-http,
  `tsx` scripts): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, D1 database IDs.
- If both exist, `.dev.vars` wins for the local Worker (`.env` values are excluded).

### CLOUDFLARE_API_TOKEN scopes

Create a **Custom Token** in the Cloudflare dashboard (My Profile → API Tokens).
The only scope strictly required for migrations is **D1: Edit** — the rest is only needed
when you use the token (instead of `wrangler login`) for `pnpm bootstrap --remote` and deploys:

| Scope | Level | Needed for |
| --- | --- | --- |
| D1 | Edit | **migrations** — the D1 HTTP API: `drizzle-kit` d1-http (`drizzle.config.*.ts`) and `wrangler d1 migrations apply` |
| Workers Scripts | Edit | `wrangler deploy`, `wrangler secret put` |
| Workers KV Storage | Edit | `wrangler kv namespace create` (`pnpm bootstrap --remote`) |
| Workers R2 Storage | Edit | `wrangler r2 bucket create` (`pnpm bootstrap --remote`) |
| Queues | Edit | `wrangler queues create` (`pnpm bootstrap --remote`) |
| User Details | Read | `wrangler whoami` (optional sanity check) |

**`pnpm check:setup`** — read-only health check anytime. `✗ FAIL` = local dev broken (with
the exact fix command), `! warn` = only blocks remote/deploy (placeholder IDs in
`wrangler.jsonc`, `example.com` still in `site.ts`, missing `CLOUDFLARE_ACCOUNT_ID`). Exit
code 1 on failures; `pnpm check:setup --strict` also fails on warnings — run it before deploying.

Before the first deploy:

1. Replace placeholder resource names/IDs in `wrangler.jsonc` (D1, R2, KV, Queue, cron) —
   `pnpm bootstrap --remote` does this for you.
2. Put secrets: `wrangler secret put JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` / `PRIV_API_KEY`
   (key generation commands in `.env.example`). `secrets.required` in `wrangler.jsonc`
   makes the deploy fail with a clear error until all three are set.
3. Update `shared/constants/site.ts` with your domains.
4. Create an admin user: register an account in the app, then flip
   `user_rights.user_admin = 1` for that user in D1
   (`wrangler d1 execute <db> --remote --command "UPDATE user_rights SET user_admin = 1 WHERE user_id = '…'"`).

## Stack

| Layer         | Tech                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| Runtime       | Cloudflare Workers (workerd) — `nodejs_compat`                                               |
| HTTP          | Hono (`/api/*` + services middleware) → React Router v8 SSR handler for everything else      |
| Frontend      | React 19 · React Router v8 (SSR, `.server.tsx` route split) · React Compiler (prod build)    |
| Styling       | Tailwind CSS v4 (`@theme` tokens, no config file) · MD3 design system · stylelint + tw-order |
| UI            | Hand-rolled MD3 component set in `app/components/ui/` (Button, TextField, Select, Dialog,…)  |
| Data          | Cloudflare D1 — Drizzle schema + migrations, Kysely as the type-safe runtime query builder   |
| Files         | Cloudflare R2 (`R2FileUploader`, avatar upload example with queued old-file deletion)        |
| Cache         | Cloudflare KV — versioned cache regions                                                      |
| Rate limiting | Durable Object (`RateLimiterDO`) — atomic per-key counters                                   |
| Async         | Cloudflare Queues (typed handlers registry) + Cron Triggers (lazy handler registry)          |
| Email         | Workers `send_email` + React Email templates (ConfirmRegistration example)                   |
| Auth          | PBKDF2 password hashing · RS256 JWT sessions (jose) · httpOnly cookies · email verification  |
| Validation    | Zod — one schema per form, shared client/server                                              |
| Tooling       | oxc (oxfmt + oxlint) · stylelint · vitest · Playwright · `tsc -b` composite typecheck        |

## Development

### Dev servers

| Command                  | Bindings                          | Use for                                             |
| ------------------------ | --------------------------------- | --------------------------------------------------- |
| `pnpm dev`               | local, emulated (`remote: false`) | everyday work — no Cloudflare credentials needed    |
| `pnpm dev:wrangler`      | remote `env.dev` resources        | testing against real dev D1/KV/R2/Queues            |
| `pnpm dev:wrangler:prod` | remote `env.prod` resources       | prod config check — treat prod data as untouchable  |
| `pnpm dev:prod`          | remote `env.prod` resources       | **careful**: live prod DB behind a local dev server |
| `pnpm dev:clean`         | local                             | wipes Vite caches when `pnpm dev` misbehaves        |

Useful while dev is running: `pnpm cron:test` (fires all cron handlers via the dev-only
`/api/_dev/cron` endpoint), `/api/mail-previews` (renders email templates), `/api/priv`
(X-API-Key protected, `PRIV_API_KEY` from `.dev.vars`).

### Database workflow

```bash
pnpm db:generate          # edit server/database/schema.ts → generates drizzle/*.sql
pnpm db:migrate:local     # apply to local emulated D1 (what pnpm dev uses)
pnpm db:migrate           # apply to remote dev D1
pnpm db:migrate:prod      # apply to remote prod D1 — run before prod deploys
pnpm db:studio:prod       # drizzle-kit studio against remote prod (read-only caution)
```

### Adding features

The repo ships an agent ruleset + skills (`.agents/`) — the fastest way to add anything:

- Rules: `.agents/rules/README.md` (index) — MD3 design, components, styling, tokens,
  routes, server/services, submit forms, localization, SEO, aliases, naming.
- Human docs: `.agents/docs/README.md` — narrative explanations of how the template works
  (request lifecycle, response/error flow, decorators, form submission flow).
- Skills: `gen-module` (generate a route/component/service/hook following all rules),
  `auto-test` / `auto-test-browser` (run + verify), `refr-module` (refactor to rules).
- Two hard conventions worth knowing first:
  - **Import aliases** — `#/` → `app`, `$/` → `server`, `@` → `shared`; server never imports `#/`.
  - **Route split** — every route is `*.tsx` (UI + re-exported loader/action) +
    `*.server.tsx` (RouteService + loader/action).

### Definition of done (run before claiming any change is complete)

```bash
pnpm typecheck   # wrangler types + react-router typegen + tsc -b
pnpm lint        # oxlint
pnpm test        # vitest (unit)
pnpm fmt && pnpm fmt:style   # formatting + class sorting, then re-check the diff
```

- After route/service/DB changes: also run the `auto-test` skill (boots `pnpm dev`, watches
  for runtime errors). After UI changes: also run `auto-test-browser`.
- `pnpm test:e2e` (Playwright) covers the smoke path end-to-end.

### All commands

| Command                                | Purpose                                                         |
| -------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                             | Dev server (filtered wrangler noise)                            |
| `pnpm typecheck`                       | `wrangler types` + `react-router typegen` + `tsc -b`            |
| `pnpm db:generate`                     | Generate D1 migrations from Drizzle schema                      |
| `pnpm db:migrate` / `db:migrate:local` | Apply migrations to remote / local D1                           |
| `pnpm fmt` / `lint`                    | oxfmt (import sort) / oxlint                                    |
| `pnpm fmt:style`                       | stylelint --fix + Tailwind class sorting                        |
| `pnpm test`                            | vitest (unit)                                                   |
| `pnpm test:e2e`                        | Playwright (boots `pnpm dev`) — smoke tests in `test/e2e/`      |
| `pnpm check:docs`                      | Validate agent docs — `.md` refs exist, `pnpm` scripts exist    |
| `pnpm gen:keys`                        | Generate local JWT keypair into `.dev.vars`                     |
| `pnpm bootstrap`                       | Bootstrap the template (local; `--remote` creates CF resources) |
| `pnpm check:setup`                     | Read-only setup health check (`--strict` = fail on warnings)    |
| `pnpm deploy`                          | build + `wrangler deploy`                                       |
| `pnpm deploy:prod`                     | prod build + deploy to the prod worker                          |

## Branching & Git workflow

The template maps environments to Cloudflare `env.dev` / `env.prod` resources
(`wrangler.jsonc`). Recommended branch model for projects built on it:

| Branch               | Environment       | Deploys via        | Migrations              |
| -------------------- | ----------------- | ------------------ | ----------------------- |
| `main`               | prod (`env.prod`) | `pnpm deploy:prod` | `pnpm db:migrate:prod`  |
| `dev`                | dev (`env.dev`)   | `pnpm deploy`      | `pnpm db:migrate`       |
| `feat/*`, `fix/*`, … | none (local only) | —                  | `pnpm db:migrate:local` |

Every merge into `dev` or `main` should be a fast, reviewed PR — CI runs on all PRs and
pushes to `main` (see below), so the branch is verified before it lands.

### Day-to-day flow

```bash
# 1. Sync + branch (from dev — never branch off stale main)
git switch dev && git pull
git switch -c feat/user-export

# 2. Work, commit — Conventional Commits (feat:, fix:, docs:, refactor:, chore:, test:)
git add -p                            # review what you stage
git commit -m "feat(user): add data export endpoint"

# 3. Verify locally (definition of done, see Development)
pnpm typecheck && pnpm lint && pnpm test

# 4. Push + open a PR into dev
git push -u origin feat/user-export
# GitHub: "Compare & pull request" → base: dev

# 5. After CI is green, merge (squash recommended) and delete the branch
git switch dev && git pull
git branch -d feat/user-export
```

### Releasing to prod (dev → main)

```bash
git switch main && git pull
git merge --no-ff dev          # --no-ff keeps a merge commit marking the release
pnpm db:migrate:prod           # migrate prod DB BEFORE deploying
pnpm deploy:prod
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin main --tags
```

### Hotfixes (prod is broken)

```bash
git switch -c fix/critical-bug main   # branch from main, not dev
# …fix, verify, PR into main (CI), then:
pnpm db:migrate:prod && pnpm deploy:prod
git switch dev && git merge main      # keep dev in sync with the hotfix
```

### Git rules of thumb

- Never commit generated/secrets files — `.gitignore` already excludes `wrangler.jsonc`,
  `.dev.vars`, `.env`; if a teammate's PR adds them, reject it.
- Never rewrite history on shared branches (`main`, `dev`) — no force-push; use `--force-with-lease`
  only on your own unreviewed feature branches after a rebase.
- Keep PRs small; rebase onto `dev` instead of merging `dev` into your feature branch
  (`git switch feat/x && git rebase dev`).
- `pnpm fmt` before committing — CI fails on unformatted code, not on style, so run it once
  locally instead of fighting review comments.

### CI (`.github/workflows/ci.yml`)

- `verify` job — `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:docs` on every PR
  and push to `main`.
- `e2e` job — Playwright smoke tests with local emulated bindings (placeholder config,
  generated JWT keys, local D1 migrations). Mirror it locally with `pnpm test:e2e`.
- CI does **not** deploy — deploys are manual (`pnpm deploy` / `pnpm deploy:prod`), so a
  migration can always run before the code that needs it.

## Architecture

```
worker.ts          Hono app fetch + queue consumer + cron — single Worker entry
server/
  setup.ts           createServices() per request (isolate-cached DB + RS256 keypair)
  core/              Database + Services types
  api/               Hono REST (priv X-API-Key, mail previews, dev cron trigger)
  services/          BaseService + auth/user/admin/preferences
  database/          Drizzle schema (migrations only) + Kysely table types
  cloudflare/        kv cache regions · Durable Object rate limiting · queue registry · cron registry
  lib/               response system · cookies (consent-gated) · crypto · mail · R2 uploader
app/
  routes.ts          central route registration
  routes/            *.tsx + *.server.tsx split (loader/action live in .server.tsx)
  components/ui/     MD3 component set (BEM css + CVA variants)
  lib/               useSubmitAction · toast · seo/createMeta · hooks
  styles/            tailwind.css tokens + main.css @layer cascade
shared/             constants · validators (zod) · message keys · enums · preferences
.agents/             rules (conventions) + skills (gen-module, auto-test, …)
```

## Trimming the template (per project)

Features are additive — remove what a project doesn't need (delete code + wrangler
binding + registrations together). Typical removals: admin panel, email/verification,
R2 uploads, queues/cron, cookie consent. The full checklist and what to keep lives in
`AGENTS.md` § "Trimming the template" — after trimming, run
`pnpm typecheck && pnpm lint && pnpm test` and delete tests that referenced removed features.

## What's intentionally NOT included

Stripe, 2FA/TOTP, Google OAuth, mobile API contract, sitemap generation, analytics.
The extension points are all there (services, queue/cron registries, mail templates,
banned emails, user rights) — add per project.
