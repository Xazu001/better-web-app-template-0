# Routes — file structure and sections

> Applies to `app/routes/**`.
> Comments (TS/TSX + CSS) → `README.md` § "Key rules summary". Services, decorators, DB, rate limiting, Zod validation, cookies → `server.md`. Form submission (`useSubmitAction`, typed submit) → `submit.md`. Messages/toasts → `localization.md`. Route styles (inline vs `@apply`, 3-tier hybrid) → `styling.md`. SEO (`createMeta`, `createKeywords`, structured data) → `seo.md`. Aliases (`#/`, `$/`, `@/`) → `aliases.md`.

## Directory structure

- `app/components/` — `ui/`, `custom/`, `pages/`
- `app/lib/` — `hooks/`, `router/`, `utils/`, `seo/`
- `app/styles/` — `main.css` (entry; `@layer reset, base, components, custom, routes, overrides;` on line 1), `theme.css` (`@theme` config + `--color-*` palette + `:root` + `@custom-media` only), `base/` (`reset,typography,scrollbar,toastify,overrides` — `@layer reset/base/overrides`), `utilities/` (`tokens` — `@theme` design tokens; `colors` — `@theme` glass variants; `theme` — light-mode `@layer base` overrides; `layout,links,ui,form` — `@utility`; `animations` — `@layer components` + keyframes), `components/` (`button,dialog,select` — shared `@layer components` shells)
- `app/routes/` — route files; `root.tsx` — root route (special, sees the whole tree)
- `app/routes.ts` — central route registration for React Router v8

## Route file types

| Suffix | Example | Environment | Purpose |
| --- | --- | --- | --- |
| `*.tsx` | `routes/admin/users.tsx` | Client + Server | Page component + `meta`/`links` + re-export `loader`/`action` from `*.server.tsx` |
| `*.server.tsx` | `routes/admin/users.server.tsx` | Server only | `RouteService` + `loader`/`action`. Never imported by the client bundle (exception: re-export in `*.tsx`) |
| `*.css` | `routes/admin/users.css` | — | Co-located styles. Rare — only named `@keyframes`/animations, shared sibling layout, complex `@media`, ordered `@apply` → `styling.md` |
| `layout.tsx` | `routes/auth/layout.tsx` | Client + Server | Shared layout wrapper with `<Outlet />` |
| `layout.server.tsx` | `routes/admin/layout.server.tsx` | Server only | `loader`/`action` for the layout (shared data for child routes) |
| `layout.css` | `routes/main/layout.css` | — | Styles shared by child routes. Rare → `styling.md` |
| `$.tsx` | `routes/$.tsx` | Client + Server | Catch-all 404 (`route("*", "routes/$.tsx")` in `app/routes.ts`) |

- **`.ts` is never used for routes** — loader/action-only files are `*.server.tsx` even if they contain only `loader` or `action`.
- **Default styles:** inline Tailwind. Route `*.css` is the exception; UI/custom components always have co-located `*.css` (BEM); pages components inline by default. → `styling.md`
- **Name colocation:** `pad.tsx` + `pad.css` for components; `route.tsx` + `route.server.tsx` + `route.css` (optional) in routes.

## Route-specific components → `app/components/pages/`

Components specific to one route NEVER live in route files — always `app/components/pages/{page}/`, one folder per route mirroring the route path:

- `routes/main/home.tsx` composes `<Hero />`, `<About />` from `#/components/pages/main/home/` — the route file only composes, never defines components (no `Route Helpers (Components specific to route)` section, no `index.{section}.tsx`, no `*.{helper}.tsx` in `app/routes/**`).
- Sub-components of a page component → same page folder (`pages/admin/users/loading.tsx` for a loading state, `pages/main/home/delete-section.tsx` for a form fragment). Descriptive kebab names, never numbered.
- Client-only component (browser DOM/APIs — canvas, WebGL, clipboard): `{component}.client.tsx` in the page folder, wrapped in `<ClientOnly>` at the usage site.
- Styling: inline Tailwind by default; `.css` only when complicated → `components.md` § "Pages components (route-specific)".
- Never registered in `app/routes.ts` — imported by the route.

## Comment splitters (inside files)

Format (70 characters, labeled):

```tsx
// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────
```

- Use **rarely** — only when the file has many top-level sections. A short, readable file gets zero splitters.
- Only **labeled** splitters, label from the standard set below — never invent labels.
- Exactly **one empty line after** the bottom line; also one before the top line.
- **Never** a bare dashes line (no label) — anywhere in the file, including directly below imports. This is the most common violation.
- A labeled splitter **directly below imports is allowed** (typical place for the first section); never code directly after imports without a splitter (when the file has sections).
- **Skip empty sections entirely** (splitter + label + no content = delete). `Imports` never gets a label.

## Standard labels (Title Case, closed set — don't invent)

- **`route.tsx`:** `Route Helpers (Types, other utils)` · `Route Loader & Action` · `Route Revalidation` · `Route Links` · `Route Meta` · `Route Component` · `Route Helpers (Lazy Components)`
- **`.server.tsx`:** `Route Helpers (Types, other utils)` · `Route Service` · `Route Loader` · `Route Action`
- **Pages component (`app/components/pages/**`):** `Component Helpers (Types, other utils)` · `Component` / `Components`
- **`layout.tsx`:** `Route Helpers (Types, other utils)` · `Route Links` · `Route Meta` · `Route Loader & Action` · `Route Component`

No match = the section probably doesn't need a splitter.

## Section order

The reader should first see what the page needs, then where it gets data, finally how it's built.

### `route.tsx`

`Imports` → `Route Helpers (Types, other utils)` → `Route Loader & Action` → `Route Revalidation` → `Route Links` → `Route Meta` → `Route Component` → `Route Helpers (Lazy Components)`

1. **Imports** — no label. External libs, aliases, relative imports from `*.server.tsx`.
2. **Route Helpers (Types, other utils)** — types used by loader/action (e.g. `type Inputs` for `useSubmitAction`) and component constants — they define the data interface, so before loader/action.
3. **Route Loader & Action** — `export { loader, action }` from `*.server.tsx`. Early = the data source is visible before meta and the component.
4. **Route Revalidation** — `export const shouldRevalidate` (only when the route defines it, e.g. `routes/main/home.tsx`).
5. **Route Links** — `export const links`. Rare; skip if empty.
6. **Route Meta** — `export const meta` via `createMeta` from `#/lib/seo`. Depends on `Route` type / `matches`, not on the component.
7. **Route Component** — `export default function` — the center of the file.
8. **Route Helpers (Lazy Components)** — `React.lazy` etc. at the very end (optional optimizations). Lazy imports point to `app/components/pages/**` — the route never defines components inline.

### `route.server.tsx`

`Imports` → `Route Helpers (Types, other utils)` → `Route Service` → `Route Loader` → `Route Action`

1. **Imports** — always `react-router`, `$/lib/decorators`, `$/services/base`, `@/validators`, etc.
2. **Route Helpers (Types, other utils)** — service helper types (rare; Zod schemas live in methods or `shared/validators`).
3. **Route Service** — the `RouteService extends BaseService` class — before loader/action because they use it.
4. **Route Loader** — `export async function loader({ context, request }: RouteLoaderArgs)`.
5. **Route Action** — `export async function action({ context, request }: RouteActionArgs)` — the rate-limit guard and dispatch also happen here (→ `server.md`).

### `layout.tsx`

`Imports` → `Route Helpers (Types, other utils)` → `Route Links` → `Route Meta` → `Route Loader & Action` → `Route Component`

- **Note:** `Route Loader & Action` comes AFTER `Route Meta` (opposite of `route.tsx`) — the layout mainly manages document structure/SEO; data is for child routes. No loader/action → skip the section.

### Pages component (`app/components/pages/**`)

`Imports` → `Component Helpers (Types, other utils)` → `Component` / `Components`

- No types/utils → start directly with `Component` (no splitter). `Component` (single) or `Components` (multiple exports).

### `root.tsx`

Root is special — exports `Layout`, `Body`, `App`, `ErrorBoundary`, `links`, `meta`, re-exports `loader`. It doesn't follow the order strictly, but still uses labeled splitters where they help.

## Route registration (`app/routes.ts`)

React Router v8 registers routes via `route`, `layout`, `index` from `@react-router/dev/routes`:

```ts
import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // API resource routes (no UI)
  route("api/cookie-consent", "routes/api/cookie-consent.tsx"),
  route("api/auth/confirm/:verificationCode", "routes/api/auth/confirm.$verificationCode.tsx"),

  // Layout with child routes
  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx")
  ]),

  // Index route inside a layout (URL of the parent, no own segment)
  layout("routes/main/layout.tsx", [
    index("routes/main/home.tsx"),
    route("search", "routes/main/search.tsx")
  ]),

  // Same module under multiple paths — explicit `id` avoids duplicate route-id errors
  route("status", "routes/status.tsx"),
  route("admin/status", "routes/status.tsx", { id: "admin-status" })

  // 404 catch-all
  route("*", "routes/$.tsx")
] satisfies RouteConfig;
```

**Registration rules:**

- First argument = URL path; second = file path relative to `app/` (without `app/`).
- File name reflects the path: `admin/users/:userId` → `users.$userId.tsx`; `api/auth/confirm/:code` → `confirm.$code.tsx`. `$param` in the name ↔ `:param` in the URL; nested parameters accumulate.
- Index route in a layout: `index("...")` or `route("...", "...", { index: true })`.
- `layout()` nests; children inherit the parent layout.
- Registering the **same module multiple times** requires a unique `{ id }` per entry (pattern: `routes/status.tsx` shared web/admin).
- **Never import `*.server.tsx` in `routes.ts`** — register `*.tsx` / `layout.tsx`; `loader`/`action` arrive via re-export.

## Loader / Action / RouteService wiring

Full rules for services, decorators, DB, rate limiting, Zod → `server.md`. Below only the route-layer wiring.

### Two type patterns

**1. Simple loader in `route.tsx`** (no service) — generated types:

```tsx
import type { Route } from "./+types/index";

export async function loader({ request }: Route.LoaderArgs) {
  return data({ success: true });
}
```

- `Route.LoaderArgs` / `Route.ActionArgs` / `Route.MetaFunction` / `Route.LinksFunction` come from the **generated** `+types/{route}.ts` (auto-generated by React Router v8).

**2. Full service in `route.server.tsx`** — decorator types:

```tsx
import { data } from "react-router";
import { createRouteService, type RouteActionArgs, type RouteLoaderArgs } from "$/lib/decorators";
import { BaseService } from "$/services/base";

class RouteService extends BaseService {
  /* @dataMethod / @actionMethod — see server.md */
}

export async function loader({ context, request, params }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.getKitData(params.id));
}
```

- `RouteLoaderArgs` / `RouteActionArgs` import from **`$/lib/decorators`** (not `app/lib/router/`) — `LoaderFunctionArgs`/`ActionFunctionArgs` with `context` wrapped in `RouterContextProvider`.
- Context: `createRouteService` pulls services + cloudflare env from `context` and sets them on the instance (`this.services`, managers). Auth: `this.auth.getUserFromRequest()`; domain calls: `this.admin.getUsers(...)` etc.

### Returning data

- Always `data(...)` from `react-router` — never raw objects. `headers` only when needed (cookies, redirect, cache): `return data(res, { headers })`.
- Redirects via `redirect` from `react-router` — never a manual `Response`.

### Re-exporting loader/action in `route.tsx`

```tsx
import { loader } from "./home.server";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };
```

- Exactly **one** re-export, inside the `Route Loader & Action` section (pattern: `routes/main/home.tsx`). No "Re-export for React Router route discovery" comment block, no duplicate `export` elsewhere.
- All server-side logic lives in `*.server.tsx` — never duplicate it in `route.tsx`.

## Route — key rules

- `Inputs` type → only in `route.tsx` `Route Helpers (Types, other utils)`, and only when `useSubmitAction` needs field error keys beyond `general`. **Never** in `.server.tsx`.
- No explicit return type for loader/action — infer via `typeof loader` / `Awaited<ReturnType<typeof loader>>`.
- Zod schema placement (inline / Route Helpers / `shared/validators`) → `server.md` § "Zod validation".
- Forms: `useSubmitAction` (+ `createTypedSubmit` for multi-action) → `submit.md`. SEO `meta` → `seo.md`. Styling → `styling.md`.

## Don't

- Don't put server-only logic in `route.tsx` → `*.server.tsx`.
- Don't define components in route files — route-specific components → `app/components/pages/{page}/` (→ `components.md` § "Pages components").
- Don't register pages components in `app/routes.ts`; never import `*.server.tsx` in `routes.ts`.
- Don't use the array index as a React key → stable unique IDs.
- Don't define `*Payload` types in `.server.tsx` → Zod schemas in service methods.
- Don't define explicit return types for loader/action → infer.
- Don't re-register the same module without a unique `{ id }`.
- Splitter violations: bare dashes lines (even below imports), stacked splitter lines, empty labeled sections, label `Imports`, vague labels (`Section`, `Main`, `Event Handlers`), labels in short barrel files.
- Don't duplicate `export { loader }` / `export { action }` blocks or annotate them — one re-export in `Route Loader & Action`, period.
- Rate limiting, decorators, cookies, DB — see the Don't list in `server.md`.
