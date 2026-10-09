# The request lifecycle

What actually happens between "a user hits enter" and "HTML lands in the browser".
Everything below is a single Cloudflare Worker — there is no separate backend server.

```
 Browser
    │
    ▼
 Cloudflare edge ──► Worker `fetch` (worker.ts)
                        │
                        ▼
                   Hono app (server/setup.ts, createApp)
                        │
                        │  middleware: createServices(env, request)   ← fresh per request
                        │
            ┌───────────┴────────────┐
            ▼                        ▼
      /api/* routes           everything else (SSR)
      Hono REST handlers            │
      (server/api/)                ▼
                          React Router handler (worker.ts)
                          RouterContextProvider:
                            cloudflareContext (env, ctx, ASSETS)
                            servicesContext  (service container)
                                │
                                ▼
                          route loader / action (*.server.tsx)
                                │
                                ▼
                          RouteService (extends BaseService)
                          validation → business logic → D1/KV/R2/Queues
```

## 1. One Worker, two "apps"

`worker.ts` creates a Hono app and mounts it as the Worker entry. Hono handles `/api/*`
(the JSON REST endpoints in `server/api/`); **everything else falls through** to the React
Router SSR handler (`app.all("*")`). That's why there is exactly one deployable unit and
one `wrangler.jsonc`.

## 2. Services are created per request

The first Hono middleware calls `createServices(env, request)` and stashes the result in
Hono's context. Two things are worth understanding:

- **Fresh service instances per request.** Services hold the current `Request` (used for
  rate limiting by IP, cookies, auth), so they cannot be shared across requests.
- **The DB connection and JWT keypair are cached at module level.** Workers reuse V8
  isolates between requests; a Kysely instance bound to D1 and an imported RS256 keypair
  are expensive to build and safe to reuse, so they're created once per isolate
  (`server/setup.ts` — `_cachedDb`, `_cachedKeyPair`).

The same `createServices` is reused by the **queue consumer** and **cron handlers** with a
synthetic `Request` — those code paths have no HTTP request, and the sentinel is never read.

## 3. React Router gets the context through `RouterContextProvider`

The catch-all Hono handler wraps two values in a `RouterContextProvider` before handing the
request to React Router (`worker.ts`):

- `cloudflareContext` — `env` (bindings), `ctx` (execution context), `ASSETS`;
- `servicesContext` — the service container from step 2.

Loaders/actions pull these out through `createRouteService` (see
`.agents/docs/decorators.md`). This is the only sanctioned way app code touches the
database — no route ever imports a raw DB client.

## 4. The route layer

Routes are split in two files: `*.tsx` (UI, re-exports loader/action) and `*.server.tsx`
(loader/action + a small `RouteService` class). The loader/action instantiates a
`RouteService` via `createRouteService`, which wires in the request, the shared DB, the
other services and the Cloudflare bindings. See `.agents/docs/responses-and-errors.md`
for what happens to its return value.

## 5. Non-HTTP entry points

`worker.ts` also exports `queue` and `scheduled` handlers. Both build services the same
way and run registered handlers (`server/cloudflare/queue/`, `server/cloudflare/crons/`).
Rate limiting, cookies and anything else that depends on `this.request` don't apply there.

## Mental model

> A request → one isolate → one Hono pass → one service container → one RouteService →
> one `data(...)` response. Nothing global besides the isolate-cached DB and keypair.
