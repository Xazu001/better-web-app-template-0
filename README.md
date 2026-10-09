# better-web-app-template

A production-grade full-stack web app template for Cloudflare Workers, built around the
conventions from the Crosspad codebase: **Hono + React Router v8 SSR in one Worker**, a
service-layer server architecture, an MD3/Tailwind v4 design system, and a complete
agent ruleset (`.agents/`) that keeps generated code consistent.

## Stack

| Layer | Tech |
| --- | --- |
| Runtime | Cloudflare Workers (workerd) — `nodejs_compat` |
| HTTP | Hono (`/api/*` + services middleware) → React Router v8 SSR handler for everything else |
| Frontend | React 19 · React Router v8 (SSR, `.server.tsx` route split) · React Compiler (prod build) |
| Styling | Tailwind CSS v4 (`@theme` tokens, no config file) · MD3 design system · stylelint + tw-order |
| UI | Hand-rolled MD3 component set in `app/components/ui/` (Button, TextField, Select, Dialog,…) |
| Data | Cloudflare D1 — Drizzle schema + migrations, Kysely as the type-safe runtime query builder |
| Files | Cloudflare R2 (`R2FileUploader`, avatar upload example with queued old-file deletion) |
| Cache | Cloudflare KV — versioned cache regions |
| Rate limiting | Durable Object (`RateLimiterDO`) — atomic per-key counters |
| Async | Cloudflare Queues (typed handlers registry) + Cron Triggers (lazy handler registry) |
| Email | Workers `send_email` + React Email templates (ConfirmRegistration example) |
| Auth | PBKDF2 password hashing · RS256 JWT sessions (jose) · httpOnly cookies · email verification |
| Validation | Zod — one schema per form, shared client/server |
| Tooling | oxc (oxfmt + oxlint) · stylelint · vitest · Playwright · `tsc -b` composite typecheck |

## Quick start

```bash
pnpm install                     # first — bootstrap itself runs via tsx (devDependency)
pnpm bootstrap                   # wrangler.jsonc + .dev.vars + JWT keys + local D1, idempotent
pnpm dev                         # http://localhost:5173 — all bindings run locally
```

Manual equivalent of `pnpm bootstrap`:

```bash
cp .dev.vars.example .dev.vars && pnpm gen:keys   # generates a local JWT keypair into .dev.vars
pnpm typegen                     # wrangler types + react-router typegen
pnpm db:generate                 # drizzle-kit → drizzle/*.sql from server/database/schema.ts
pnpm db:migrate:local            # apply migrations to the local (emulated) D1
```

Local dev uses **emulated bindings** (top-level `remote: false` in `wrangler.jsonc`), so
`pnpm dev` works without Cloudflare credentials. `pnpm dev:wrangler` / `dev:prod` run
against the `env.dev` / `env.prod` remote resources — those need real resource IDs and
`CLOUDFLARE_ACCOUNT_ID` (see `.env.example`).

**`.dev.vars` vs `.env`** — different runtimes, never mix them:

- `.dev.vars` — Worker runtime secrets (`JWT_*`, `PRIV_API_KEY`). Wrangler injects them
  into `env` during local dev; the deployed equivalent is `wrangler secret put`.
- `.env` — **never read by the Worker.** For Node tooling only (`drizzle-kit` d1-http,
  `tsx` scripts): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, D1 database IDs.
- If both exist, `.dev.vars` wins for the local Worker (`.env` values are excluded).

## Bootstrap & check:setup

`pnpm bootstrap` automates the local part of the checklist above; `pnpm check:setup` checks the
state anytime. Both are idempotent and safe to re-run.

**`pnpm bootstrap`** — bootstraps a fresh copy of the template:

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

**`pnpm check:setup`** — read-only health check. `✗ FAIL` = local dev broken (with the exact
fix command), `! warn` = only blocks remote/deploy (placeholder IDs in `wrangler.jsonc`,
`example.com` still in `site.ts`, missing `CLOUDFLARE_ACCOUNT_ID`). Exit code 1 on
failures; `pnpm check:setup --strict` also fails on warnings — run it before deploying.

Before the first deploy:

1. Replace placeholder resource names/IDs in `wrangler.jsonc` (D1, R2, KV, Queue, cron).
2. Put secrets: `wrangler secret put JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` / `PRIV_API_KEY`
   (key generation commands in `.env.example`). `secrets.required` in `wrangler.jsonc`
   makes the deploy fail with a clear error until all three are set.
3. Update `shared/constants/site.ts` with your domains.
4. Create an admin user: register an account in the app, then flip
   `user_rights.user_admin = 1` for that user in D1
   (`wrangler d1 execute <db> --remote --command "UPDATE user_rights SET user_admin = 1 WHERE user_id = '…'"`).

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

Two hard conventions worth knowing first:

- **Import aliases** — `#/` → `app`, `$/` → `server`, `@` → `shared`; server never imports `#/`.
- **Route split** — every route is `*.tsx` (UI + re-exported loader/action) +
  `*.server.tsx` (RouteService + loader/action). Full rules: `.agents/rules/`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (filtered wrangler noise) |
| `pnpm typecheck` | `wrangler types` + `react-router typegen` + `tsc -b` |
| `pnpm db:generate` | Generate D1 migrations from Drizzle schema |
| `pnpm db:migrate` / `db:migrate:local` | Apply migrations to remote / local D1 |
| `pnpm fmt` / `lint` | oxfmt (import sort) / oxlint |
| `pnpm fmt:style` | stylelint --fix + Tailwind class sorting |
| `pnpm test` | vitest (unit) |
| `pnpm test:e2e` | Playwright (boots `pnpm dev`) — smoke tests in `test/e2e/` |
| `pnpm check:docs` | Validate agent docs — `.md` refs exist, `pnpm` scripts exist |
| `pnpm gen:keys` | Generate local JWT keypair into `.dev.vars` |
| `pnpm bootstrap` | Bootstrap the template (local; `--remote` creates CF resources) |
| `pnpm check:setup` | Read-only setup health check (`--strict` = fail on warnings) |
| `pnpm deploy` | build + `wrangler deploy` |

## What's intentionally NOT included

Stripe, 2FA/TOTP, Google OAuth, mobile API contract, sitemap generation, analytics.
The extension points are all there (services, queue/cron registries, mail templates,
banned emails, user rights) — add per project.
