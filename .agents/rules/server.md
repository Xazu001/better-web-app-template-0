# Server + Services — rules

> `server/` is pure server-side code — it never reaches the browser.
> Zod validation shared client/server → `submit.md` · React Router route conventions → `routes.md` · Import aliases → `aliases.md` · Message key resolution → `localization.md`.

## Structure

````
server/
├── index.ts / setup.ts / load-context.ts
├── core/           Types: Database, Services
├── api/            Hono routes: priv/, dev.ts, mail-previews.ts
├── database/       schema.ts (Drizzle), tables.ts (Kysely types)
├── services/       base.ts, auth.ts, preferences.ts
│                   + admin/, user/ (one class each)
├── middleware/     priv.ts (X-API-Key)
├── cloudflare/     kv/ (cache/ CacheManager + CacheRegion), rate-limit/ (RateLimiterDO)
│                   queue/ (QueueManager, registry, handlers/), crons/ (registry, handlers/)
└── lib/
    ├── response/   api.ts, form.ts, http.ts (responses), messages.ts, extract.ts
    ├── cookies/    cookies.ts (definitions), helpers.ts (cookiesModify)
    ├── crypto/     password.ts (PBKDF2)
    ├── decorators/ service-methods.ts (dataMethod/actionMethod), route-service.ts
    ├── mail/       provider.ts, templates/
    ├── utils/      files.ts (R2FileUploader)
    ```

## Where to place API

- **`server/api/` (Hono)** — external clients, 3rd-party. REST (JSON in/out). Responses: `apiSuccess()` / `apiError()`. Auth: `priv/` middleware (X-API-Key).
- **`app/routes/` (React Router)** — only your own frontend. FormData in, `data(...)` out. Auth: `cookiesModify`, `sessionCookie`, `this.auth.getUserFromRequest()`.

## Bootstrap (`server/setup.ts`)

- `createServices(env, request)` — creates a **fresh `ServiceContainer` per request**; the DB (`_cachedDb`) and RS256 `KeyPair` (`_cachedKeyPair`) are cached at module level (V8 isolate reuse).
- `wireServices(container, env)` — calls `setServices()` + `initializeManagers(env)` on every service instance.
- `createApp()` (Hono) — per-request middleware: `createServices` into `c.get("services")`. Mounts `/api`. Global `onError`: thrown `Response` as-is, unknown → logs + 500.
- `db` is not exported from `server/database/index.ts` — `Database` (`{ op: Kysely<Tables>, cf: D1Database }`) is built in `createServices`. In routes, `createRouteService` passes `services.base.db` as the instance's `db`.

## Two types of services

- **BaseService** (`server/services/base.ts`) — base class for all services. Takes `request` + `db`, manages Cloudflare managers (cache, queue), provides DB wrappers and result helpers.
- **RouteService** (`app/routes/*.server.tsx`) — extends `BaseService`, created per request via `createRouteService(RouteService, context, request)`. Use only when the route needs DB / services / decorators / rate limiting — a plain `loader` is cheaper on static pages. Each `*.server.tsx` defines its own class; not shared between routes.

### BaseService — API

```ts
// server/services/base.ts
export class BaseService {
  constructor(
    public request: Request,
    public db: Database
  ) {}
  // noop KV/Queue managers until initializeManagers(env) is called
}
````

**Fields and getters:**

- `this.request` / `this.db` — public, set in the constructor.
- `this.responses` / `this.getMessage` — HTTP Response helpers + server translations.
- `this.cache` (CacheManager) · `this.queue` (QueueManager).
- Protected: `this.env` (Env) · `this.r2` (R2Bucket) · `this.services` (full container) + shortcuts `this.auth`, `this.user`, `this.admin`, `this.preferences`.
- Cross-service calls: `await this.services.user.getById(id)` — decorated methods of other services are called as regular functions.

**Wiring:** `setServices(factory)` · `initializeManagers(env)` (swaps noop managers for real KV/Queue).

**Results:** `this.ok(data)` · `this.none()` · `this.formSuccess(data)` · `this.formError(errors)` · `this.throw(FormErrors | Response)` (re-throws `Response` as-is, wraps errors as `{ fields }`).

**Rate limiting:** `this.rateLimit({ time? })` / `this.rateLimitForm({ time? })` → § "Rate limiting".

**DB:** `this.exDbOperation(fn)` · `this.exDbBatchOperation(queries)` · `this.prepareQuery(query)` → § "Database".

### Extending BaseService

```ts
// server/services/user/index.ts (fragment)
export class UserService extends BaseService {
  @dataMethod()
  public async getById(userId: string) {
    const user = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .where("users.user_id", "=", userId)
        .selectAll()
        .executeTakeFirst()
    );

    if (!user) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    return this.ok(user);
  }
}
```

All services are instantiated and wired in `createServices()` (`server/setup.ts`).

### RouteService

```ts
// server/lib/decorators/route-service.ts (API)
export type RouteLoaderArgs = Omit<LoaderFunctionArgs, "context"> & {
  context: Readonly<RouterContextProvider>;
};
export type RouteActionArgs = Omit<ActionFunctionArgs, "context"> & {
  context: Readonly<RouterContextProvider>;
};

export function createRouteService<T extends typeof BaseService>(
  ServiceClass: T,
  context: Readonly<RouterContextProvider>,
  request: Request
): InstanceType<T>;
```

`createRouteService` pulls `servicesContext` + `cloudflareContext` from the React Router `context`, instantiates the class with `services.base.db`, wires the service container, and initializes Cloudflare managers (KV, Queue, R2).

```ts
// app/routes/main/home.server.tsx
class RouteService extends BaseService {
  @dataMethod()
  async getHomeData() {
    const user = await this.auth.getUserFromRequest();
    return this.ok({ user });
  }
}

export async function loader({ context, request }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.getHomeData());
}
```

## Decorators (`$/lib/decorators`)

Every **public** service method must have one. The asymmetry: `@dataMethod` **throws** errors, `@actionMethod` **catches and wraps** them into `formError`.

| Decorator            | Usage                  | Success              | Error                                                                                              |
| -------------------- | ---------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `@dataMethod()`      | Loaders, fetch, guards | `this.ok(data)`      | `Response` re-thrown; `{ fields }` → 400; unknown → logs + 500                                     |
| `@actionMethod(err)` | Actions, forms         | `this.formSuccess()` | `{ fields }` → `formError`; `Response` → `formError({ general })`; unknown → logs + fallback `err` |

- `@actionMethod` **never** re-throws — a thrown `Response` (from `this.responses.*` or another service) is extracted into `formError({ general })`.
- `@actionMethod` argument = fallback `FormErrors` for every non-field error — always set a meaningful message (`{ general: "Failed to update user" }`). Omitted → `{ general: "OPERATION_FAILED" }`.
- `throw redirect(...)` passes untouched through `@dataMethod`.
- **Without a decorator:** only `private` helper methods called internally by a decorated method — their errors propagate up to the caller's decorator. The decorator goes on the public entry point only.

## Response systems — one per context, never mixed

| Context         | Success                                    | Error                                                   | Import               |
| --------------- | ------------------------------------------ | ------------------------------------------------------- | -------------------- |
| Route loader    | `this.ok(data)` / `this.none()` + `data()` | `this.throw(this.responses.*)` → re-thrown `Response`   | `$/lib/decorators`   |
| Route action    | `this.formSuccess(data)`                   | `this.throw({ fields })` → `formError`                  | `$/lib/decorators`   |
| REST API (Hono) | `c.json(apiSuccess(data))`                 | `c.json(apiError(msg), status)` / `apiValidationError`  | `$/lib/response`     |
| Queue handler   | `queueOk(data)`                            | `queueFailed(error, retryable)` — `retryable` re-queues | `$/cloudflare/queue` |

Dispatching in loader/action:

1. **Simple return** (preferred) — result not needed for server logic: `return data(await route.getData())`.
2. **Await for processing** — result modifies headers/cookies or conditions logic: `const res = await route.doAction()` → build `headers` → `return data(res, { headers })`.

### HTTP Response helpers — `this.responses` (`server/lib/response/http.ts`)

Each builder accepts `message?: string | { general?: string }` and falls back to a default key from `en_server_errors.json` when omitted:

| Method                           | Status | Default key                       |
| -------------------------------- | ------ | --------------------------------- |
| `getBadRequest()`                | 400    | `BAD_REQUEST`                     |
| `getUnauthorized()`              | 401    | `UNAUTHORIZED`                    |
| `getNoAccess()`                  | 403    | `NO_ACCESS`                       |
| `getNotFound()`                  | 404    | `RESOURCE_NOT_FOUND`              |
| `getConflict()`                  | 409    | `CONFLICT`                        |
| `getUnprocessableEntity(errors)` | 422    | JSON `{ success: false, errors }` |
| `getTooManyRequests()`           | 429    | `RATE_LIMIT_EXCEEDED`             |
| `getInternalError()`             | 500    | `INTERNAL_SERVER_ERROR`           |
| `getServiceUnavailable()`        | 503    | `SERVICE_UNAVAILABLE`             |

Plus generic: `json(data, status, statusText?)` · `success(data)` · `created(data)` · `noContent()`.

## Errors and messages

### `this.throw({ fields })` vs `this.throw(this.responses.*)`

`this.responses.*("KEY")` produces a proper `Response` with a message key the client can resolve via `getMessageByKey` — prefer it over raw `{ general }` strings in services, so web and API clients get a consistent, resolvable error.

| Layer                                          | Allowed forms                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Services** (`server/services/*`)             | **Only** `this.throw(this.responses.<method>("KEY"))` — key must exist in `en_server_errors.json`                                                      |
| **`RouteService`** (`app/routes/*.server.tsx`) | `{ general: "TEXT" }` or `this.responses.*("KEY")` — prefer `this.responses.*` when a key fits; `{ general }` only for ad-hoc, route-specific messages |

```ts
// ✅ Service — always this.responses.*
this.throw(this.responses.getNotFound("USER_NOT_FOUND"));

// ✅ RouteService — both OK
this.throw(this.responses.getNoAccess("USER_NOT_FOUND")); // preferred
this.throw({ general: "You must be logged in to edit this user" }); // ad-hoc
```

### Adding new keys (`shared/locales/en_server_errors.json`)

- Key: `UPPER_SNAKE_CASE`, descriptive (`USER_NOT_FOUND`, `FAILED_TO_BAN_USER`); placed **alphabetically** (file is sorted).
- Value: English sentence — canonical message resolved by `getMessageByKey`; may contain `{name}` placeholders.
- Don't fall back to a raw string in a service because "no key fits" — add the key, then use it immediately.

### Server-side message rules

- `this.getMessage(key)` (`server/lib/response/messages.ts`) — **internal** server messages only, never client UI strings.
- `FormErrors.general` is typed `string` — any English string, a key, or a serialized key `"KEY|param=value"` (client resolves via `getMessageByKey`), e.g. ``this.responses.getTooManyRequests(`RATE_LIMIT_EXCEEDED_RETRY|retryAfter=${result.retryAfter}`)``.
- `Validator.getErrors(result)` returns dynamic strings → **must** cast: `this.throw(Validator.getErrors(result) as FormErrors)`.
- Client strings are hardcoded (EN-only app) → `localization.md`.

## Zod validation in `@actionMethod`

Every `@actionMethod` validates input with a Zod schema. **No** `as` casts, **no** `*Payload` types — the schema is the only source of truth, derive types via `z.infer`.

**Schema placement:**

- Short (≤3 fields, single use) → **inline** `z.object({...})` in the method. Don't extract to a const or "Route Helpers (Types)".
- Long or reused → "Route Helpers (Types, other utils)" section of `.server.tsx`, referenced by name.
- Shared client + server → `shared/validators/` (export in `index.ts`, import via `@/validators`) — only when both sides actually validate. Details → `submit.md`.

**Validator API** (`@/validators`):

- `Validator.validateData(data, schema)` — sync, for parsed data (`Record<string, string | File>`).
- `Validator.validateForm(request, schema)` — async, extracts FormData from `Request`.
- `Validator.isSuccess(result)` / `Validator.isError(result)` — type guards (`{ data }` vs `{ errors }`).
- `Validator.getErrors(result)` — field errors dictionary.

```ts
class RouteService extends BaseService {
  @actionMethod({ general: "SOMETHING_WRONG" })
  async submitContactForm() {
    const result = await Validator.validateForm(this.request, ContactSchema);

    if (!Validator.isSuccess(result)) {
      this.throw(Validator.getErrors(result) as FormErrors);
    }

    const { type, email, subject, message } = result.data;
    // ... business logic

    return this.formSuccess({ ok: true });
  }
}
```

## Rate limiting

Rate limiting is **not** Hono middleware — it runs on the `RATE_LIMITER` **Durable Object** (`server/cloudflare/rate-limit/`, `RateLimiterDO`): one DO instance per `identifier:path` key (`idFromName`), so counters are atomic and immediately consistent. KV is **not** suitable for this — it is eventually consistent, caps writes at 1/s per key, and concurrent `get`→`put` cycles overwrite each other. `BaseService` exposes two wrappers (available on every subclass): **1 request per `time`-second window** (default `time: 0.5`), keyed by `cf-connecting-ip` → `x-forwarded-for` → `x-real-ip` → `"unknown"`, scoped to the request pathname (+ optional `scope`). Missing `RATE_LIMITER` binding (trimmed config) → rate limiting is a no-op.

- **`rateLimitForm({ time })`** — default for route actions where the client uses `useSubmitAction`. Returns `RateLimitFormResult`; **does not throw** — you check `rl.isError` and `return data(rl.getError())`, which renders `errors.general`.
- **`rateLimit({ time })`** — when there is **no** client-side form handler (Hono/REST, plain fetch). **Throws** a `429 Response` that short-circuits the flow.
- Call it **only** in `action` (before any service call / parsing) or in a Hono handler — never inside a service method (`server/services/*` or `RouteService`), so it gets the raw `request` and stops the flow before any logic starts.

```ts
export async function action({ context, request }: RouteActionArgs) {
  const route = createRouteService(RouteService, context, request);

  const rl = await route.rateLimitForm({ time: 5 });
  if (rl.isError) return data(rl.getError());

  return data(await route.submitContactForm());
}
```

Without `useSubmitAction` (e.g. quick search): `await route.rateLimit({ time: 2 });` as the first line of the `action` — the thrown `429` becomes the action error. The 429 message is always the serialized key `RATE_LIMIT_EXCEEDED_RETRY|retryAfter=N`.

## Cache (KV)

Two layers, each with a single responsibility — never skip straight to raw `this.cache.get/set` for cache-like data:

| Layer  | File                                                               | Responsibility                                                                           |
| ------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Raw KV | `server/cloudflare/kv/cache/manager.ts` (`this.cache`)             | JSON + TTL wrapper over KV. Only for transient KV records (e.g. OAuth state), not caches |
| Region | `server/cloudflare/kv/cache/region.ts` (`this.cache.region(name)`) | Versioned namespace: `getOrSet` / `get` / `set` / `update` / `invalidate`                |

- **Region invalidation is O(1):** each region keeps a version counter (`__ver:<region>`) in KV; `invalidate()` bumps it — one write orphans every entry (they expire via TTL, fallback 24 h). `invalidate(key)` deletes a single entry.
- **`region.update(key, updater)` mutates a cached value in place** — warm, no cold miss. No-op on miss; skips the write when the updater returns the same reference.
- **Cache syncs are best-effort** — a KV failure after a successful DB write is logged, never thrown.
- New domain cache modules follow `cloudflare/kv/cache/`: declare regions + sub-keys + TTLs once, expose typed read helpers and semantic mutation methods. Call sites never inline region strings.

```ts
// Read — region name, sub-key and TTL encapsulated
const users = await this.cache.region("users").getOrSet("all", () => this.getAllUsers(), 600);
const userData = await this.cache
  .region("user")
  .getOrSet(userId, () => this.getUserById(userId), 3600);

// Warm in-place mutation
await this.cache.region("user").update(userId, (user) => ({ ...user, user_name: "New" }));
// Invalidate one entry / the whole region
await this.cache.region("user").invalidate(userId);
await this.cache.region("users").invalidate();
```

## Database

Two interfaces: `db.op` (Kysely query builder — preferred, type-safe) and `db.cf` (raw D1 — **only** inside `exDbBatchOperation`, because D1 batch doesn't support Kysely). Drizzle is used **only** for schema definition (`schema.ts`) and migrations — never as a runtime query interface. Table types for Kysely: `tables.ts`. Dates are stored as timestamps.

- `exDbOperation(fn)` — wraps a single query; logs `[Database Error]` and throws `500` on failure.
- `exDbBatchOperation(queries)` — takes `Compilable[]`, compiles each via `prepareQuery`, runs `db.cf.batch(...)`; returns **the first row** of each statement's result. Never nest `exDbOperation` inside it.
- `prepareQuery(query)` — Kysely → D1 prepared statement; converts `Date` and date-parsable strings to epoch ms.

```ts
const user = await this.exDbOperation(() =>
  this.db.op
    .selectFrom("users")
    .leftJoin("user_rights", "user_rights.user_id", "users.user_id")
    .where("users.user_id", "=", userId)
    .select(["users.user_id", "users.user_name", "user_rights.user_admin"])
    .executeTakeFirst()
);
```

## Auth & sessions

- RS256 JWT via `getKeyPair()` — env `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (base64), cached per isolate. Implementation: `server/services/auth.ts`.
- `AuthService.createToken(userId, noExpire?)` — `4h` default, `5y` when `noExpire = true`.
- `AuthService.verifyToken(token)` / `verifyRequest()` — parse `sessionCookie`.
- User resolution: `this.auth.getUserFromRequest()` — record from `users` + `user_rights`, `null` when no session.
- Passwords: `hashPassword(password)` / `verifyPassword(password, storedHash)` from `$/lib/crypto` (PBKDF2).
- Hono `privMiddleware` (`server/middleware/priv.ts`) — `X-API-Key` vs `PRIV_API_KEY`, constant-time comparison.
- Admin panel access — `AdminService.isUserAdmin` enforced in the route loader (`app/routes/admin/layout.server.tsx`).

## Cookies

- **All** writes go through `cookiesModify(request, (m, c) => {...})` from `$/lib/cookies/helpers` — building `Set-Cookie` manually is forbidden. `m` = `CookieModifier`, `c` = cookie definitions. Returns `Headers` ready for `data(res, { headers })`.
- Service methods return plain data — the **action** attaches cookie headers.
- Operations: `m.set(key, value)` · `m.setCookie(cookie, value)` · `m.clear(key)` · `m.clearCookie(cookie)` · `m.patch(key, partial)` · `m.patchCookie(cookie, partial)` · `m.clearAll()`. The callback's last result: `return m.getHeaders(request)`.
- Built-in definitions (`c`): `session` (httpOnly, `SessionValue`, necessary) · `preferences` · `consent` · `analytics` · `marketing`.
- New cookie: `createTypedCookie<T>(name, options, category)` in `server/lib/cookies/cookies.ts`, then register it in the `cookies` object in `helpers.ts` + `CookieValueMap`.
- Consent gating: a non-`necessary` cookie is not set without consent (unless the user has a valid session); `clear` always passes; writing a value identical to the current one is deduped (no redundant `Set-Cookie`).
- `hasAnalyticsConsent(request)` — versioned consent cookie **or** `X-Analytics-Consent: 1` header (API clients).

## Don't

- Don't import from `#/` in server code → `aliases.md`.
- Don't nest `exDbOperation` inside `exDbBatchOperation`.
- Don't serialize cookies or build `Set-Cookie` manually.
- Don't put sensitive data in the response body — httpOnly cookies.
- Don't use `rateLimit` in actions with `useSubmitAction` — use `rateLimitForm`; don't call either inside a service method.
- Don't use `RouteService` on static pages / without auth or services.
- Don't skip decorators on public service methods.
- Don't cast `as` on form data or define `*Payload` types — Zod only.
- Don't use `this.throw({ general })` in `server/services/*` — `this.responses.*("KEY")` → § "Errors and messages".
