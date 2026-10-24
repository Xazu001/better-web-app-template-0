# AGENTS.md — better-web-app-template

> **Stack:** React Router v8 · React 19 · Drizzle · Cloudflare Workers · Tailwind v4

This is the **always-on index**. For rules, architecture, conventions, and decision matrices → read `.agents/rules/README.md` first, then the relevant rule file.

**Package manager:** npm and pnpm — both supported; `npm run <script>` ≡ `pnpm <script>`. This file uses the `pnpm` shorthand.

## Rule Files

Rules live in `.agents/rules/`. Read the index first, then only the files relevant to the task.

| File              | Topic                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `README.md`       | Index — start here                                                                       |
| `md3-design.md`   | MD3 concepts: color roles, elevation, state layer, uix-ripple, shape, motion             |
| `components.md`   | React component implementation: BEM, CVA, `useRipple`, `data-state`, TSX/CSS             |
| `styling.md`      | CSS mechanics: `@layer`, `color-mix`, hover gating, property order, no-dupes             |
| `tokens.md`       | Design tokens: colors, typography, sizes, motion, breakpoints, z-index                   |
| `routes.md`       | Routes: file types, section splitters, loader/action/service wiring                      |
| `server.md`       | Server + services: BaseService, RouteService, DB, auth, cookies, rate limiting, KV cache |
| `submit.md`       | Action/Form submission: `useSubmitAction`, typed submit, client/server validation        |
| `localization.md` | L10n: `getMessageByKey`, serialized keys                                                 |
| `seo.md`          | SEO: `createMeta`, noindex, JSON-LD                                                      |
| `aliases.md`      | Import aliases: boundaries, examples, forbidden patterns, diagnostics                    |
| `naming.md`       | File/directory naming: `kebab-case` everywhere, patterns, enforcement                    |

## Import Aliases

| Alias | Maps to      | Scope  |
| ----- | ------------ | ------ |
| `#/`  | `./app/*`    | App    |
| `$/`  | `./server/*` | Server |
| `@/`  | `./shared/*` | Shared |

| From     | Can import       | Cannot import |
| -------- | ---------------- | ------------- |
| `server` | `$/`, `@/`       | `#/`          |
| `app`    | `#/`, `@/`, `$/` | —             |
| `shared` | `@/`             | `#/`, `$/`    |

Always use aliases, never `../../` across directories. Within same directory, `./utils` is fine.

## Skills

Skills live in `.agents/skills/<name>/SKILL.md`. Use `/skill-name` or invoke via the skill tool.

| Skill               | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `gen-module`        | Generate route, component, service, hook, etc.                   |
| `refr-module`       | Refactor file(s) to comply with rules                            |
| `auto-test`         | Run app, check terminal for build/runtime/server errors, fix     |
| `auto-test-browser` | Test via browser (Puppeteer), check console/visuals, fix         |
| `gen-tokens`        | Generate design tokens docs from Tailwind v4 CSS + UI components |
| `opt-tokens`        | Read rules once, work from memory                                |
| `min-opt-tokens`    | Zero filler, act don't narrate                                   |

## Verification (definition of done)

Run before claiming any change is complete — in this order:

```bash
pnpm typecheck   # wrangler types + react-router typegen + tsc -b
pnpm lint        # oxlint
pnpm test        # vitest (unit)
pnpm fmt && pnpm fmt:style   # formatting + class sorting, then re-check the diff
```

- After route/service/DB changes: also run the `auto-test` skill (boots `pnpm dev`, watches for runtime errors).
- After UI changes: also run the `auto-test-browser` skill.
- The CI workflow is archived at `.github/workflows/ci.yml.disabled` (GitHub Actions disabled) — run the same checks locally: `typecheck + lint + test + check:docs` plus `test:e2e` (Playwright, local emulated bindings).

## Working style

- Zero filler — act, don't narrate. No "I'll now…", no restating the task.
- Read each rule file **once**, extract constraints, work from memory — don't re-read the same file in a session.
- Ask only when genuinely blocked (ambiguous intent, conflicting rules, destructive action).
- Edits over code blocks in chat; smallest correct diff.
- Repo `.md` docs use standard Markdown tables — the fenced `table` block format (`columns:` / `row:`) is only for formatter-processed `public/` files (as in crosspad-web) → `.agents/rules/README.md` § "Markdown tables".

## Trimming the template (per project)

Features are additive — remove what a project doesn't need. Keep the core: `BaseService`, response system, cookies helpers, validators, auth. Typical removals (delete code + wrangler binding + registrations together):

- **Admin panel** — `app/routes/admin/`, `server/services/admin/`, admin entries in `app/routes.ts`.
- **Email/verification** — `server/lib/mail/`, `send_email` binding, `routes/api/auth/confirm.*`.
- **R2 uploads** — `server/lib/utils/files.ts`, R2 binding, avatar example.
- **Queues/Cron** — `server/cloudflare/queue/`, `server/cloudflare/crons/`, bindings, `worker.ts` wiring.
- **Cookie consent** — consent cookies + banner + `routes/api/cookie-consent.tsx` + its unit test.

After trimming: `pnpm typecheck && pnpm lint && pnpm test` — delete tests that referenced removed features.

## What's in the template

- **Server (`server/`)** — Hono app + React Router handler in `worker.ts`; services (`BaseService` + `auth`/`user`/`admin`/`preferences`), decorators, cookies (session + theme + consent system), PBKDF2 passwords, RS256 JWT (jose), mail (React Email), markdown transformer (`renderMarkdown` — marked + sanitize-html), R2FileUploader, D1 (Kysely queries + Drizzle schema/migrations), KV cache, Durable Object rate limiting, Queue + Cron registries with example handlers.
- **App (`app/`)** — MD3 UI component set (`components/ui/`), form submission system (`useSubmitAction` + typed submit), SEO meta (`createMeta`), status/404/error pages, auth routes (login/register/confirm), admin panel (dashboard + user management), `/docs` markdown example (`.md` from `public/` via the ASSETS binding), toasts, theme toggle (light/dark/system cookie).
- **Shared (`shared/`)** — constants (site/env/R2), validators (Zod), message keys (`en_server_errors.json` + `getMessageByKey`), enums, preferences.
- **Cloudflare bindings** — D1, R2, KV, Queues, Cron Triggers, Email, static assets, Durable Object (`RATE_LIMITER`). All configured in `wrangler.jsonc` with placeholder IDs — replace before deploying.
- **Auth system** — email/password (PBKDF2), email verification (send_email binding), RS256 JWT in httpOnly session cookie, admin rights (`user_rights.user_admin`), banned emails, cookie consent. No 2FA/TOTP, no OAuth — add per project.

## Setup (new project checklist)

`pnpm bootstrap` automates the local steps below (install, wrangler.jsonc copy, `pnpm env:init`, typegen, migrations); remote resources are provisioned explicitly via `pnpm cf:setup` (dry-run plan by default, `--apply` gated). `pnpm check:setup` verifies the state anytime (`--strict` before deploying). Details: `README.md` § "Bootstrap & check:setup".

`.dev.vars.example` and `.env.example` are generated from `scripts/lib/env-manifest.ts`; edit the manifest and run `pnpm env:examples` rather than editing examples by hand. Tooling credentials are optional with `wrangler login`.

1. `pnpm install`
2. Provision owned CF resources: `pnpm cf:setup --account-id <ACCOUNT_ID>` (offline plan), `--apply` to create + write IDs into `wrangler.jsonc`; prod via `pnpm cf:setup:prod`
3. Update `db:migrate` script names to match
4. Create local env files with `pnpm env:init`; set deployed secrets per environment with `pnpm exec wrangler secret put JWT_PRIVATE_KEY|JWT_PUBLIC_KEY|PRIV_API_KEY --env dev|prod --config wrangler.jsonc` (always pass `--env`; without it the command targets the local-name Worker). Rotate local keys with `pnpm gen:keys [file]`; deployed environments use their own independently generated pairs — never reuse local keys.
5. Update `shared/constants/site.ts` (URLs, brand, contact email)
6. `pnpm db:generate && pnpm db:migrate`
7. `pnpm dev` → http://localhost:5173
8. Create an admin: register a user in the app, then `wrangler d1 execute template-db-dev --command "UPDATE user_rights SET user_admin = 1 WHERE user_id = '…'"`

## Formatting & Class Sorting

Commands and mechanics → `.agents/rules/README.md` § "Formatting / lint" (single source of truth).

- `pnpm fmt` — format + sort imports (`oxfmt`). `pnpm fmt:style` — stylelint fix + Tailwind class sorting. `pnpm lint` / `lint:fix` — oxlint.
- **Class order source of truth:** `scripts/tw-order.ts` → `ORDER_GROUPS` (mirrors `order/properties-order` from `stylelint.config.js`). To change the order: edit `ORDER_GROUPS` — no regen step needed.
- Run `pnpm fmt:style` manually — NOT on save.
