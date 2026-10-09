# Responses and error catching

The template has one convention for "what a response looks like" and a chain of layers
that turn any failure into that shape. This doc walks both.

## The two response envelopes

**Forms/actions (SSR routes)** return a `FormResponseResult` — a plain, serializable
object, because React Router passes it to the client through `data(...)`:

```ts
{ success: true,  result: … }                              // formSuccess
{ success: false, errors: { email: "…", general: "…" } }   // formError
```

**REST API (`/api/*`)** answers with JSON envelopes built from `apiSuccess` /
`apiError` / `apiValidationError` (`server/lib/response/api.ts`) — same idea, shaped for
`fetch` callers.

## Message keys, not sentences

Error values are usually **keys**, not final text — e.g. `INVALID_CREDENTIALS` or
`RATE_LIMIT_EXCEEDED`. The client translates them with `getMessageByKey` (shared
dictionaries, `shared/locales/en_server_errors.json` + `@/utils/messages`). One key can
therefore render in any language, and a `key|param=value` form (e.g.
`RATE_LIMIT_EXCEEDED_RETRY|retryAfter=30`) carries parameters alongside the key.

## The `responses` helpers

`server/lib/response/http.ts` exports `responses` — factories that build real `Response`
objects with the right status and a message-key body: `getUnauthorized()`,
`getNotFound()`, `getBadRequest()`, `getTooManyRequests()`, `getInternalError()`, plus
`json`/`success`/`created`/`noContent` for payloads. Two ways they travel:

- **returned** from loaders/API handlers as the actual HTTP response;
- **thrown** from deep inside services as control flow (`throw this.responses.getNotFound()`).

## Where errors get caught (the chain)

A thrown error in this codebase can be one of three shapes: a `Response` (from
`responses.*`), a `{ fields: FormErrors }` marker (from `this.throw(fields)`), or
something unexpected (a real bug). The chain, outermost last:

1. **Service method decorators** (`server/lib/decorators/service-methods.ts`) — `@actionMethod`
   converts the error into a `formError` (so actions always return a FormResponse);
   `@dataMethod` rethrows `Response` as-is and converts the rest into 400/500 `Response`s.
   Details in `.agents/docs/decorators.md`.
2. **The route action/loader** (`*.server.tsx`) — actions return `data(res)`, so a caught
   form error reaches the client as a normal payload, never as a thrown exception.
3. **React Router ErrorBoundary** — a rethrown `Response` (or any loader crash) becomes a
   route error. `resolveRouteError` (`app/lib/router/error.ts`) digs the message key out of
   the response body (plain text, JSON envelope, whatever) and resolves it into a
   localized, structured error page (`$.tsx` renders it — the 404/500/status screens).
4. **Hono `app.onError`** (`server/setup.ts`) — the `/api/*` safety net: thrown `Response`s
   pass through untouched; anything else is logged and answered with a plain 500.
5. **`exDbOperation`** (`server/services/base.ts`) — a convenience wrapper for DB calls:
   logs the real error server-side and throws a clean `getInternalError()` so DB internals
   never leak to clients.

## Rules of thumb

- Expected failures (bad input, taken email, no access) → **return** a form error / throw a
  `responses.*` — the user should see a translated message, not a stack trace.
- Unexpected failures → let the layers above handle it: log + generic 500 is already the
  default everywhere.
- Never `JSON.stringify` an error into a response yourself — you'll bypass translation and
  leak internals.
