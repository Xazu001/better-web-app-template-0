# Rules — index

> **Stack:** React Router v8 · React 19 · Drizzle · Cloudflare Workers · Tailwind v4
> **Design:** authentic Google MD3 / Material You, light + dark themes (theme cookie: `light`/`dark`/`system`)
> **Read only the files needed for the task** — each topic has a single source of truth.

This file is the canonical index of all project rules. Detailed rules for each topic are located in separate files in this directory. If you're unsure which file to look at — use the topic table below.

## Stack and design

- React Router v8 · React 19 · Drizzle · Cloudflare Workers · Tailwind v4
- Design: authentic Google MD3 / Material You, **light + dark** — dark palette is the `@theme` default, `html.light` overrides live in `app/styles/utilities/theme.css`; theme cookie `light`/`dark`/`system` — details in `md3-design.md`
- **Pure React MD3** — no `@material/web` / `@lit-labs/ssr`; uix-ripple + state layer via `useRipple` + `<span>` overlay

## Architecture (directories)

| Directory | What lives here | Who imports here |
| --- | --- | --- |
| `server/` | Pure server (never in browser): `services/`, `api/`, `database/`, `cloudflare/`, `lib/` | `$`/`@`, **not** `#` |
| `app/` | Hybrid: `routes/`, `components/ui/`, `lib/`, `styles/` | `#`, `@`, `$` (all) |
| `shared/` | Shared server + app: `constants/`, `validators/`, `utils/`, `enums/`, `locales/` | only `@` |

Full import boundaries → `aliases.md`.

## Import aliases

| Alias | Target | Scope |
| --- | --- | --- |
| `#/` | `./app/*` | App |
| `$/` | `./server/*` | Server |
| `@/` | `./shared/*` | Shared |

| From | Can import | Cannot import |
| --- | --- | --- |
| `server` | `$/`, `@/` | `#/` |
| `app` | `#/`, `@/`, `$/` | — |
| `shared` | `@/` | `#/`, `$/` |

- Always use aliases between `app`/`server`/`shared` directories — never `../../`.
- Within the same directory `./utils` is OK (relative within a module is more readable).
- `scripts/` lives outside `app`/`server`/`shared`, so relative paths there (`../shared/constants`).

Details + OK/FORBIDDEN examples → `aliases.md`.

## Topic files (single source of truth per topic)

| File | Topic |
| --- | --- |
| `md3-design.md` | MD3 concepts: color roles, elevation, state layer, uix-ripple, shape, motion, typography, anti-patterns |
| `components.md` | React component implementation: BEM, CVA, `useRipple`, `data-state`, TSX structure, CSS layers |
| `styling.md` | CSS mechanics: 3-tier hybrid, `@layer` cascade, `color-mix`, hover gating, property order, no-dupes, spacing |
| `tokens.md` | Tokens: OKLCH colors, fluid typography, size tokens, motion, breakpoints, z-index, shadows, w-mod-unit |
| `routes.md` | Routes: file types, section splitters, section order, `app/routes.ts`, loader/action/service |
| `server.md` | Server + Services: BaseService, RouteService, decorators, DB, auth, cookies, rate limiting, KV cache, Zod validation |
| `submit.md` | Form submission: `useSubmitAction`, typed submit, client/server validation |
| `localization.md` | L10n: `getMessageByKey`, serialized keys |
| `seo.md` | SEO: `createMeta`, noindex, JSON-LD |
| `aliases.md` | Import aliases: boundaries, examples, prohibitions, diagnostics of bad imports |
| `naming.md` | File/directory naming: `kebab-case` everywhere, per-module patterns, enforcement |

## Naming

| What | Convention |
| --- | --- |
| Files/directories | `kebab-case` → `naming.md` |
| BEM custom | `block__elem--mod` |
| BEM UI | `ui-*` |
| Route class block (RARE) | `{route}` BEM block |
| `@utility` | `kebab-case` |
| `@utility` style bundles | `uix-*` (`uix-link-primary`, `uix-header-hero`) |
| MD3 component / React | `PascalCase` |
| TS/JS symbols | `camelCase` |
| CSS custom props | `--kebab-case` |
| Size tokens | `--size-{comp}-*` |
| Motion tokens | `--ease-*` / `--duration-*` |
| Co-located styles | `*.css` (`button.css`, `users.css`) |

## Exports and imports

- Components → **named**, Routes → **default**, Utils → **named**.
- **No barrel exports** — import per-file; exception: `utils/index.ts`.
- **React imports:** always `import * as React from "react"` + `React.*` access (`React.useEffect`, `React.ReactNode`, `React.createContext`, `React.StrictMode`, ...). No named imports (`import { useState } from "react"`), no default import, no mixed default+named. Re-export a React type with `export type { X } from "react";`. → `components.md` § "React imports — namespace convention"

## Key rules summary (details in topic files)

- **Comments (TS/TSX):** code documents itself — a comment only when it adds context not detectable from names/types/structure. When: non-obvious business logic ("why"), workarounds with source, security/performance decisions, `TODO[data]` (mandatory format: `// TODO[2025-03-01]: …`), non-trivial algorithms. Never: restating code in words, commented-out code (delete — history is in git), JSDoc when the name explains it, fields repeating the name (`/** The name */ name: string`), flow narration (`// Add to history`).
- **Comments (CSS):** even rarer than TS. Allowed: section label in a large stylesheet, browser workarounds, non-obvious `@apply`. Inline format (block comment), **not** three separate lines like TS splitters. Empty line after the label.
- **Hover gating:** every raw `:hover` in `.css` **must** be inside `@media (hover: hover) { ... }`. Tailwind `hover:` in TSX — already gated. `:active` / `:focus-visible` — NOT gated. → `styling.md` § "Hover gating"
- **`@layer` cascade:** `reset, base, components, custom, routes, overrides` at the top of `app/styles/main.css`. Every co-located `*.css` wrapped in the appropriate `@layer`. → `styling.md` § "@layer cascade"
- **Sizes:** UI ALWAYS component tokens — height-only `h-{comp}-{size}` (e.g. `h-btn-md`), width-only `w-{comp}-{size}`, or shared `size-{comp}-{size}` for a square; never `h-10`/`h-12`. Custom components: `h-{comp}-{size}` when a token exists, otherwise `h-*` in rem. Routes/pages: `h-*` rem / `dvh` / `mod-unit`. → `styling.md` § "Core rules"
- **Breakpoints:** `phone:`/`tablet:`/`desktop:`/`large-desktop:`/`xlarge-desktop:`/`2xlarge-desktop:`/`huge:` in TSX; `@media (--bp_tablet)` in `.css`. **No** `sm:`/`md:`/`lg:`/`xl:`. → `tokens.md` § "Breakpoints"
- **`@layer base`** contains **ONLY** typography — layout padding explicitly (`px-site`, `pt-*`, `min-h-dvh`).
- **Property order:** positioning → display/layout → **size** → spacing → typography → color → shape → effects → animation → interaction → custom utility. → `styling.md` § "Property order"
- **No-duplicate-styles:** don't repeat in `className`/`@apply` what already comes from `@layer base`, `@apply` in `.css`, base BEM class, Tailwind built-in, `@theme`, state layer/uix-ripple, CSS inheritance. → `styling.md` § "No-duplicate-styles"
- **color-mix:** percentages multiples of 5; omit `in srgb` (default); keep `in oklch`. → `styling.md` § "color-mix rules"
- **Spacing:** `gap` > `padding` > `margin`. Never `mb-*` on each child of a list instead of `gap` on the parent. Padding/margin NEVER vary by breakpoint — no `desktop:p-*`/`tablet:py-*`/`phone:m-*` etc., one fixed value (responsive spacing only on explicit request). → `styling.md` § "Spacing"
- **State layer:** `<span>` child with `bg-current`, `opacity-[0.1]` (hover/focus/active), `rounded-[inherit]`, `pointer-events-none`. NOT `hover:bg-*`, NOT `::after`, NOT `bg-on-surface`. → `md3-design.md` § "State layers"
- **Ripple:** `useRipple` → `{ surfaceRef, handlers, rippleState }`, ~600ms, from the point of touch. → `md3-design.md` § "Ripple"
- **Variant = color role:** shape and appearance from `.css`, color from `variant`. No `color` prop, no variants like `filled`/`outlined`. → `md3-design.md` § "Variant = color role"
- **Elevation without shadows:** surface hierarchy (`surface` → `elevation-1` → `elevation-2` → `float` → `popover`) instead of decorative shadows. → `md3-design.md` § "Elevation"
- **Icons scale with `size`:** every inline icon (`__icon`, `__chevron`, `__check`, `__trailing`) scales with the component's `size` (sm=1.25rem, md=1.5rem, lg=1.75rem) via `.css` rules scoped by the size modifier — never a fixed size that ignores `size`. For portaled content (Select/Menu/Dialog) the size class goes on the portal root. → `components.md` § "Icons scale with `size`"

## Markdown tables

- Repo `.md` docs (`AGENTS.md`, `.agents/rules/*`, `.agents/skills/*`) — **standard Markdown tables only**. Never convert them to the fenced `table` block format.
- The fenced `table` block format (`columns:` header + `row:` entries) is only for `.md` files in `public/` rendered through the transformer (`renderMarkdown` in `$/lib/markdown` — like crosspad-web) — anywhere else it renders as a plain code block instead of a table.

## Formatting / lint

| Command | What it does |
| --- | --- |
| `pnpm fmt` | Format JS/TS/JSX/TSX + sort imports with `oxfmt` (`sortImports` in `.oxfmtrc.json`) |
| `pnpm fmt:style` | 1. Fix CSS with `stylelint --fix` (properties order + `@apply` class order) <br> 2. Sort Tailwind classes in TSX/JSX/TS/JS with `tsx scripts/tw-order.ts` |
| `pnpm lint` | Lint with `oxlint` |
| `pnpm lint:fix` | `oxlint --fix && oxfmt --write` |

**Class order source of truth:** `scripts/tw-order.ts` → `ORDER_GROUPS` (mirrors `order/properties-order` from `stylelint.config.js`).

- **TSX `className`**: sorted by `scripts/tw-order.ts` (`sortClassesInCode`). Run `pnpm fmt:style` manually — NOT on save.
- **CSS `@apply`**: sorted by custom stylelint plugin `scripts/stylelint-apply-order.ts` (rule `apply-apply/order`, imports from `tw-order.ts`, autofix via `stylelint --fix`).
- **CSS properties**: sorted by `stylelint-order` (`order/properties-order` in `stylelint.config.js`).
- **VSCode format-on-save:** `oxc` (`editor.defaultFormatter: oxc.oxc-vscode`) formats TSX/JSX/TS/JS on save; CSS formatting is manual via `pnpm fmt:style` (formatOnSave disabled for CSS). Run `pnpm fmt:style` manually for class sorting.

To change the class order: edit `ORDER_GROUPS` in `scripts/tw-order.ts` — no regen step needed.
