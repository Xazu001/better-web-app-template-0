# The form submission flow (end to end)

How a form — using the login screen as the example — travels from keystroke to
"logged in", and every place it can fail gracefully along the way.

```
 submit(formData)                     POST /login
 ────────────────►  [client Zod] ──────────────►  action (login.server.tsx)
      ▲                  │                              │
      │          stop on local errors                 ▼
      │                                            rateLimitForm()
      │ errors (translated)                          │ allowed?
      │                                                  ▼
      │                                         Validator.validateForm (server Zod)
      │                                                  │
      │                                                  ▼
      │                                  auth.loginWithPassword() ──► D1
      │                                                  │
      └────────────── FormResponseResult ◄──────────────┘
                                      (via @actionMethod)
   success: set session cookie, navigateTo      failure: per-field / general errors
```

## 1. Client — `useSubmitAction` (`app/lib/router/use-submit-action.ts`)

The component binds the hook with the shared Zod schema and a success redirect:

```ts
const { submit, isSubmitting, errors, success } = useSubmitAction<Inputs>({
  fetcher,
  navigateTo: "/",
  schema: LoginSchema
});
```

`submit(formData)` first runs **client-side validation** with the same Zod schema the
server will use. If it fails, errors are translated (`getMessageByKey`) and mapped onto
fields — no network round trip at all. Otherwise it hands the FormData to a React Router
`fetcher`, which POSTs to the route action. Multiple rapid submits are swallowed
(`preventMultiple`).

## 2. Server — the action (`app/routes/auth/login.server.tsx`)

- `createRouteService(...)` wires the route service (context, DB, bindings);
- `rateLimitForm()` guards the endpoint — a hit rate returns immediately as a form error
  with `RATE_LIMIT_EXCEEDED_RETRY|retryAfter=…`;
- the service method (wrapped in `@actionMethod`) runs **server-side validation**
  (`Validator.validateForm` — the server never trusts the client), then the real logic
  (`auth.loginWithPassword`);
- on success the action sets the httpOnly session cookie via `cookiesModify` and returns
  `data(res, { headers })`.

No matter what happens inside, the action returns a `FormResponseResult` — failures
become payloads, not exceptions.

## 3. Client again — response handling

`useSubmitAction` watches `fetcher.data`:

- **success** → `result` lands in state, `onSuccess` runs, and the `navigateTo` redirect
  is queued until the fetcher is idle (navigating mid-revalidation would leave the URL
  updated but the old UI on screen);
- **failure** → every entry in `errors` is translated through `getMessageByKey`, then
  exposed as `errors.email`, `errors.password`, `errors.general` — the component binds
  them straight to `<FormField errorMessage={errors?.email}>` and an `Alert` for
  `general`.

## Why this shape

- **One validation source** — the same Zod schema is compiled into the client bundle and
  run on the server, so error messages can't drift between the two.
- **Message keys travel, UI translates** — the server returns keys; the client owns
  language. The server never needs to know the user's locale to reject a password.
- **Idempotent UI state** — `isSubmitting` derives from the fetcher state, `reset()`
  clears everything; there's no hand-rolled loading flag to keep in sync.

For the error-catching chain around the service method, see
`.agents/docs/responses-and-errors.md`; for the decorators themselves,
`.agents/docs/decorators.md`.
