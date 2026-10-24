# better-web-app-template

A production-grade full-stack web app template for Cloudflare Workers, built around the
conventions from the Crosspad codebase: **Hono + React Router v8 SSR in one Worker**, a
service-layer server architecture, an MD3/Tailwind v4 design system, and a complete
agent ruleset (`.agents/`) that keeps generated code consistent.

## Requirements

| Requirement         | Version                                                                            | Notes                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js             | **≥ 22** (22 LTS or 24 recommended — local verification runs on 24)                | Vite 8 needs ≥ 20.19, wrangler 4 needs ≥ 22 — so 22 is the practical floor                                                                                                                  |
| npm **or** pnpm     | pnpm **12.5.1** pinned via `packageManager` (npm ships with Node)                  | every script is package-manager agnostic — `npm run <script>` ≡ `pnpm <script>`; docs use the `pnpm` shorthand. With corepack enabled the pin forces pnpm — don't enable it if you want npm |
| Git                 | any recent version                                                                 | branching model in [Branching & Git workflow](#branching--git-workflow)                                                                                                                     |
| Cloudflare account  | free plan is enough — **except the email system, which needs a paid plan**         | **not needed for local dev** — every binding (D1, R2, KV, Queues, DO, email) is emulated locally. Needed only for `pnpm cf:setup` and deploys                                               |
| Cloudflare auth     | `wrangler login` **or** `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` in `.env` | required for remote resources, migrations against remote D1, `wrangler secret put` — [token scopes](#cloudflare_api_token-scopes)                                                           |
| Email Routing       | **paid plan required** + verified domain on your Cloudflare account                | the only part that needs a paid plan — everything else works on the free plan; locally, preview templates at `/api/mail-previews`                                                           |
| Playwright Chromium | `pnpm exec playwright install --with-deps chromium`                                | only for `pnpm test:e2e`                                                                                                                                                                    |

**Machine-local files are never committed** (all gitignored): `wrangler.jsonc`, `.dev.vars`,
`.env`, `worker-configuration.d.ts`, `.build/`, `.wrangler/`. Every fresh clone regenerates
them via `pnpm bootstrap` — never copy secrets between machines through the repo.

## Setup

```bash
npm install                      # or: pnpm install (first — bootstrap itself runs via tsx, a devDependency)
npm run bootstrap                # or: pnpm bootstrap — wrangler.jsonc + local env files + D1, idempotent
npm run dev                      # or: pnpm dev → http://localhost:5173 — all bindings emulated locally
```

Both package managers work here: every script is package-manager agnostic
(`npm run <script>` ≡ `pnpm <script>`) and `bootstrap`/`check:setup` detect which one
invoked them. The rest of this README uses the `pnpm` shorthand.

`pnpm bootstrap` bootstraps a fresh copy of the template (idempotent — safe to re-run):

1. `pnpm install` — skipped when `node_modules` exists.
2. Copies `wrangler.example.jsonc` → `wrangler.jsonc` — skipped when it exists.
3. Runs `pnpm env:init` to create or update `.dev.vars` and `.env` (local env files
   only — `pnpm env:init --env dev` creates the optional remote-dev file).
4. `pnpm typegen` → `pnpm db:generate` → `pnpm db:migrate:local`.

Bootstrap is local-only — any flag (including `--remote`) is rejected. Remote resource
provisioning is a separate explicit step: `pnpm cf:setup --account-id <ACCOUNT_ID>`
prints an offline plan (no calls, no writes); `pnpm cf:setup --account-id <ACCOUNT_ID>
--apply` provisions owned D1/KV/R2/queues after typing the account ID (`pnpm cf:setup:prod`
for env.prod). It never touches DNS, secrets, deploys or migrations, and never adopts a
mismatched remote resource. Auth: `wrangler login` or `CLOUDFLARE_API_TOKEN` in `.env`.

Manual equivalent of `pnpm bootstrap`:

```bash
pnpm env:init                     # creates local secrets/tooling files and distinct JWT pairs
pnpm typegen                     # wrangler types + react-router typegen
pnpm db:generate                 # drizzle-kit → drizzle/*.sql from server/database/schema.ts
pnpm db:migrate:local            # apply migrations to the local (emulated) D1
```

`.dev.vars.example` and `.env.example` are generated from `scripts/lib/env-manifest.ts`.
Edit the manifest, then run `pnpm env:examples`; do not edit generated examples by hand.

**`.dev.vars` vs `.env`** — different runtimes, never mix them:

- `.dev.vars` — Worker runtime secrets (`JWT_*`, `PRIV_API_KEY`) for the local env
  (the top-level `wrangler.jsonc` config). Wrangler injects them into `env` during
  `pnpm dev`; the deployed equivalent is `wrangler secret put --env <dev|prod>`.
- `.dev.vars.dev` — a **complete** independent secrets file used only by
  `pnpm dev:remote` (local serve against remote env.dev resources). Create it with
  `pnpm env:init --env dev`; it is never a source of deployed secrets.
- Deployed dev/prod secrets come from `wrangler secret put <NAME> --env dev|prod`.
  There is no local production secrets file, and no dev script serves prod locally.
- `.env` — tooling only (`drizzle-kit` d1-http, `tsx` scripts): `.env.example` is the
  generated template, and `pnpm env:init` creates `.env` if missing. It holds
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and D1 database IDs; use `wrangler login`
  instead if you don't need a tooling token. Convention is `.dev.vars`; Wrangler may fall
  back to `.env` if no `.dev.vars` exists, so keep `.env` tooling-only.
- If both exist, `.dev.vars` wins for the local Worker (`.env` values are excluded).

Rotate keys with `pnpm gen:keys [file]` (for example, `pnpm gen:keys .dev.vars.dev`).

`pnpm dev:remote` connects to live dev D1/R2/KV resources and uses `.dev.vars.dev`
secrets on your machine — remote writes are real. Queues and email stay emulated in
`env.dev`, so no real messages are enqueued and no real mail is sent. There is no
`dev:prod` — prod is never served behind the dev server.

### CLOUDFLARE_API_TOKEN scopes

Prefer separate least-privilege Cloudflare API tokens for local tooling and deployment
rather than one all-account token.

Create a **Custom Token** in the Cloudflare dashboard (My Profile → API Tokens).
The only scope strictly required for migrations is **D1: Edit** — the rest is only needed
when you use the token (instead of `wrangler login`) for `pnpm cf:setup` and deploys:

| Scope              | Level | Needed for                                                                                                         |
| ------------------ | ----- | ------------------------------------------------------------------------------------------------------------------ |
| D1                 | Edit  | **migrations** — the D1 HTTP API: `drizzle-kit` d1-http (`drizzle.config.*.ts`) and `wrangler d1 migrations apply` |
| Workers Scripts    | Edit  | `wrangler deploy`, `wrangler secret put`                                                                           |
| Workers KV Storage | Edit  | `wrangler kv namespace create` (`pnpm cf:setup`)                                                                   |
| Workers R2 Storage | Edit  | `wrangler r2 bucket create` (`pnpm cf:setup`)                                                                      |
| Queues             | Edit  | `wrangler queues create` (`pnpm cf:setup`)                                                                         |
| User Details       | Read  | `wrangler whoami` (optional sanity check)                                                                          |

**`pnpm check:setup`** — read-only health check anytime. `✗ FAIL` = local dev broken (with
the exact fix command), `! warn` = only blocks remote/deploy (placeholder IDs in
`wrangler.jsonc`, `example.com` still in `site.ts`, missing `CLOUDFLARE_ACCOUNT_ID`). Exit
code 1 on failures; `pnpm check:setup --strict` also fails on warnings — run it before deploying.

Before the first deploy:

1. Replace placeholder resource names/IDs in `wrangler.jsonc` (D1, R2, KV, Queue, cron) —
   `pnpm cf:setup` does this for you (dry-run plan by default; `--apply` requires confirmation).
2. Run `pnpm env:init` to create the local JWT pair in `.dev.vars` (optionally
   `pnpm env:init --env dev` for the remote-dev file). Deployed dev/prod need
   their own independent JWT pairs, generated securely outside the project —
   never copy either local file's pair — then set per environment:

   ```bash
   pnpm exec wrangler secret put JWT_PRIVATE_KEY --env dev --config wrangler.jsonc
   pnpm exec wrangler secret put JWT_PUBLIC_KEY --env dev --config wrangler.jsonc
   pnpm exec wrangler secret put JWT_PRIVATE_KEY --env prod --config wrangler.jsonc
   pnpm exec wrangler secret put JWT_PUBLIC_KEY --env prod --config wrangler.jsonc
   ```

   Never reuse local keys on deployed environments. Also set `PRIV_API_KEY`.
   `secrets.required` in `wrangler.jsonc` makes the deploy fail with a clear
   error until all three are set.

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

### Dev servers & environments

| Command           | Wrangler env             | Bindings                                     | Use for                                          |
| ----------------- | ------------------------ | -------------------------------------------- | ------------------------------------------------ |
| `pnpm dev`        | top-level (local config) | everything emulated (`remote: false`)        | everyday work — no Cloudflare credentials needed |
| `pnpm dev:local`  | top-level                | same as `pnpm dev` (compatibility alias)     | —                                                |
| `pnpm dev:remote` | `env.dev`                | remote dev D1/KV/R2; queues + email emulated | testing against real dev resources               |
| `pnpm dev:clean`  | top-level                | wipes Vite caches when `pnpm dev` misbehaves | —                                                |

The top-level `wrangler.jsonc` config **is** the local environment — there is no
`env.local` and no `dev:prod` (prod is never served behind the dev server; deploy
with `pnpm deploy:prod` instead). `pnpm dev` clears `CLOUDFLARE_ENV` so an inherited
shell value can never accidentally target a remote env. Every serve is `appEnv=local`:
localhost URLs, OAuth callbacks and cookies stay local; `CLOUDFLARE_ENV` only selects
which bindings the Worker sees. `pnpm dev:remote` talks to **remote** dev resources —
remote writes are real — but queue producers and `send_email` stay emulated, so no
real messages are enqueued and no real mail is sent. Durable Objects and static
assets stay local in every mode.

| Binding         | `pnpm dev` (top-level) | `pnpm dev:remote` (`env.dev`) | deployed `env.dev`/`env.prod` |
| --------------- | ---------------------- | ----------------------------- | ----------------------------- |
| D1 / KV / R2    | emulated               | remote dev                    | remote                        |
| Queue producers | emulated               | emulated                      | real                          |
| `send_email`    | emulated               | emulated                      | real                          |
| Cron triggers   | none                   | none                          | prod schedule only            |
| DO / assets     | local                  | local                         | —                             |

Secrets come from the env's own file — `.dev.vars` locally, `.dev.vars.dev` for
`pnpm dev:remote` — created via `pnpm env:init` / `pnpm env:init --env dev`. The dev
server fails fast with the exact `env:init` command when the file or a core key
(`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `PRIV_API_KEY`) is missing.

Useful while dev is running: `pnpm cron:test` (fires all cron handlers via the dev-only
`/api/_dev/cron` endpoint), `/api/mail-previews` (renders email templates), `/api/priv`
(X-API-Key protected, `PRIV_API_KEY` from `.dev.vars`).

### Database workflow

```bash
pnpm db:generate          # edit server/database/schema.ts → generates drizzle/*.sql
pnpm db:generate:prod     # same schema → drizzle-prod/*.sql (separate prod history)
pnpm db:migrate:local     # apply dev history to local emulated D1 (what `pnpm dev` uses)
pnpm db:migrate           # apply dev history to remote dev D1
pnpm db:migrate:prod      # apply prod history to remote prod D1 — run before prod deploys
pnpm db:studio:prod       # drizzle-kit studio against remote prod (read-only caution)
```

`drizzle/` is the dev+local history; `drizzle-prod/` is the independent production history,
initialized as a byte-for-byte copy of the dev baseline (same filenames/journal — existing
D1 migration tracking is preserved). `db:generate:prod` reads the **current** shared
`server/database/schema.ts` — prod is not a frozen snapshot; dev experiments never append
prod SQL. Author custom SQL/data migrations separately per history; never rewrite applied SQL.

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

| Command                                | Purpose                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                             | Dev server, fully local emulated bindings (top-level config)                                  |
| `pnpm dev:local`                       | Compatibility alias for `pnpm dev`                                                            |
| `pnpm dev:remote`                      | Dev server, remote `env.dev` D1/KV/R2 (queues/email emulated)                                 |
| `pnpm typecheck`                       | `wrangler types` + `react-router typegen` + `tsc -b`                                          |
| `pnpm db:generate`                     | Generate D1 migrations (dev/local history)                                                    |
| `pnpm db:generate:prod`                | Generate D1 migrations (prod history `drizzle-prod/`)                                         |
| `pnpm db` / `db:local` / `db:prod`     | Apply migrations: remote dev / local / remote prod                                            |
| `pnpm db:full` / `db:full:local`       | Generate + apply dev history (remote dev / local)                                             |
| `pnpm db:full:prod`                    | Generate prod history + apply to remote prod                                                  |
| `pnpm db:migrate` / `db:migrate:local` | Compatibility aliases for `db` / `db:local`                                                   |
| `pnpm fmt` / `lint`                    | oxfmt (import sort) / oxlint                                                                  |
| `pnpm fmt:style`                       | stylelint --fix + Tailwind class sorting                                                      |
| `pnpm test`                            | vitest (unit)                                                                                 |
| `pnpm test:e2e`                        | Playwright (boots `pnpm dev`) — smoke tests in `test/e2e/`                                    |
| `pnpm check:docs`                      | Validate agent docs — `.md` refs exist, `pnpm` scripts exist                                  |
| `pnpm gen:keys`                        | Generate local JWT keypair into `.dev.vars`                                                   |
| `pnpm env:init`                        | Create/update `.dev.vars` + `.env`; `--env dev` creates `.dev.vars.dev` for `pnpm dev:remote` |
| `pnpm env:examples`                    | Regenerate tracked environment examples from the manifest                                     |
| `pnpm bootstrap`                       | Local-only bootstrap (any flag rejected)                                                      |
| `pnpm cf:setup` / `cf:setup:prod`      | Provision CF resources (offline plan; `--apply` gated)                                        |
| `pnpm check:setup`                     | Read-only setup health check (`--strict` = fail on warnings)                                  |
| `pnpm deploy` / `deploy:dev`           | dev build + `wrangler deploy` (`deploy` aliases `deploy:dev`)                                 |
| `pnpm deploy:prod`                     | prod build + deploy to the prod worker                                                        |

## Branching & Git workflow

The template maps environments to Cloudflare `env.dev` / `env.prod` resources
(`wrangler.jsonc`). Recommended branch model for projects built on it:

| Branch               | Environment       | Deploys via        | Migrations              |
| -------------------- | ----------------- | ------------------ | ----------------------- |
| `main`               | prod (`env.prod`) | `pnpm deploy:prod` | `pnpm db:migrate:prod`  |
| `dev`                | dev (`env.dev`)   | `pnpm deploy`      | `pnpm db:migrate`       |
| `feat/*`, `fix/*`, … | none (local only) | —                  | `pnpm db:migrate:local` |

Every merge into `dev` or `main` should be a fast, reviewed PR — run the verify suite
locally before merging (the archived CI workflow is disabled; see below).

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

# 5. After local verification is green, merge (squash recommended) and delete the branch
git switch dev && git pull
git branch -d feat/user-export
```

### Releasing to prod (dev → main)

```bash
git switch main && git pull
git merge --no-ff dev          # --no-ff keeps a merge commit marking the release
pnpm db:generate:prod          # generate prod SQL into drizzle-prod/ and review it
pnpm db:prod                   # apply reviewed prod migrations BEFORE deploying
pnpm deploy:prod
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin main --tags
```

### Hotfixes (prod is broken)

```bash
git switch -c fix/critical-bug main   # branch from main, not dev
# …fix, verify, PR into main (CI), then:
pnpm db:generate:prod && pnpm db:prod && pnpm deploy:prod
git switch dev && git merge main      # keep dev in sync with the hotfix
```

### Git rules of thumb

- Never commit generated/secrets files — `.gitignore` already excludes `wrangler.jsonc`,
  `.dev.vars`, `.env`; if a teammate's PR adds them, reject it.
- Never rewrite history on shared branches (`main`, `dev`) — no force-push; use `--force-with-lease`
  only on your own unreviewed feature branches after a rebase.
- Keep PRs small; rebase onto `dev` instead of merging `dev` into your feature branch
  (`git switch feat/x && git rebase dev`).
- `pnpm fmt` before committing — unformatted code fails the local formatting check, so run it once
  locally instead of fighting review comments.

### CI (`.github/workflows/ci.yml.disabled` — GitHub Actions disabled)

- `verify` job (archived definition) — `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm check:docs`. With Actions disabled, run these locally before merging.
- `e2e` job (archived definition) — Playwright smoke tests with local emulated bindings
  (placeholder config, generated JWT keys, local D1 migrations). Run locally with `pnpm test:e2e`.
- Deploys are manual (`pnpm deploy` / `pnpm deploy:prod`), so a migration can always run
  before the code that needs it.

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
  styles/            theme.css palette + utilities/tokens.css + main.css @layer cascade
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
