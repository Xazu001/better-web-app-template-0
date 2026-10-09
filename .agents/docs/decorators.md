# Decorators, `createRouteService` and `this.throw()`

Decorators exist here for one reason: every service method needs the same
error-translation boilerplate, so it lives in exactly one place. Here's how the pieces fit.

## `createRouteService` — the wiring, not a decorator

`server/lib/decorators/route-service.ts`. A route's loader/action calls:

```ts
const route = createRouteService(RouteService, context, request);
```

It pulls `servicesContext` and `cloudflareContext` from the React Router context, then
builds a `RouteService` instance with the shared DB, the service container (so
`this.auth`, `this.user`, `this.admin`, `this.preferences` work) and — when the Cloudflare
context exists — the KV/Queue/R2 bindings (`initializeManagers(env)`). Without this call
the service would run with noop KV/Queue bindings (deliberately safe defaults from
`BaseService`).

## `this.throw()` — the convention for signaling failures

`BaseService.throw(input)` (see `server/services/base.ts`) is **not** an error to the
user — it's the standard way a service method says "this failed, here are the field
errors". It throws either a `Response` (pass-through) or the `{ fields: FormErrors }`
marker object, which the decorators below pick up and translate. Example from the login
route:

```ts
const validationResult = await Validator.validateForm(this.request, LoginSchema);
if (!Validator.isSuccess(validationResult)) {
  this.throw(validationResult.errors as FormErrors); // → field errors for the form
}
```

## `@actionMethod(defaultError?)` — for methods called from actions

Wraps a service method so the route action always receives a `FormResponseResult`:

- `{ fields }` → `formError(fields)` — per-field errors, exactly what the form UI wants;
- thrown `Response` → the message key is extracted (`getMessageFromResponse`) and becomes
  `formError({ general: key })`;
- anything else (a real bug) → `console.error` + `formError(defaultError)` — a safe
  fallback like `{ general: "SOMETHING_WRONG" }`, never a crash.

```ts
class RouteService extends BaseService {
  @actionMethod({ general: "SOMETHING_WRONG" })
  public async loginUser() { … }   // never throws to the action
}
```

## `@dataMethod()` — for methods feeding loaders (data)

The mirror image for **loaders**, where a `formError` object would be useless — a loader
must produce data or a real HTTP error. `@dataMethod` rethrows a `Response` untouched
(status preserved), converts `{ fields }` into a 400, and replaces unexpected errors with a
500 after logging. The error then bubbles to the ErrorBoundary, which renders the
status page.

## Which one when?

| Context                        | Decorator       | On failure                                                   |
| ------------------------------ | --------------- | ------------------------------------------------------------ |
| Form submission (route action) | `@actionMethod` | returns `formError` — the form displays field/general errors |
| Data loading (route loader)    | `@dataMethod`   | throws a `Response` — ErrorBoundary renders the status page  |

## Rate limiting on the same service

`BaseService` also owns the rate-limit helpers, because they need the request (IP, path):

- `rateLimit()` — throws a 429 `Response` when the limit is hit (loader-friendly);
- `rateLimitForm()` — returns a `RateLimitFormResult` instead, so an action can
  `return data(rl.getError())` and show a translated "too many attempts, retry in Xs"
  message inline.

Limits are atomic (one Durable Object instance per `ip + path` key) and degrade to a
no-op when the `RATE_LIMITER` binding is missing (trimmed configs).
