# Action/Form Submission — rules

> Zod validation in `@actionMethod`, `FormErrors`, response systems → `server.md`. Auto-resolution of errors via `getMessageByKey` → `localization.md`. Section order in route files → `routes.md`.

Two patterns: `useSubmitAction` (standard forms) and typed submit (multi-action routes).

## `useSubmitAction` hook

- **Location:** `app/lib/router/use-submit-action.ts`, re-export from `#/lib/router` and `#/lib`.
- **Import:** `import { useSubmitAction } from "#/lib/router";`
- **Generics:** `useSubmitAction<TData, TInputs>` — `TData` = success type (`result`), `TInputs` = shape of inputs for field-level errors.

### Return values

| Field          | Type                                                            | Description                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submit`       | `(data, options?) => void`                                      | Submits the form. `data` = `FormData` or `Record<string, any>` (object → `FormData`; `null`/`undefined` omitted, rest `String(value)`). `options` = per-call overrides of any option (`method`/`action`/`encType`/`schema`). |
| `isSubmitting` | `boolean`                                                       | Pending state — set on `submit()` and synced with `fetcher.state !== "idle"`. Drives `data-state="loading"` / `disabled` on the button.                                                                                      |
| `errors`       | `Partial<Record<keyof TInputs, string>> & { general?: string }` | Field errors + `general`. **Already translated** by `getMessageByKey` — render directly.                                                                                                                                     |
| `result`       | `TData \                                                        | null`                                                                                                                                                                                                                        |
| `success`      | `boolean`                                                       | Success flag of the last request.                                                                                                                                                                                            |
| `reset`        | `() => void`                                                    | Resets `errors`, `result`, `success`, `isSubmitting`.                                                                                                                                                                        |
| `fetcher`      | `ReturnType<typeof useFetcher<FormResponseResult<TData>>>`      | Internal or external React Router fetcher.                                                                                                                                                                                   |

### Options

| Option            | Default           | Description                                                                                             |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `fetcher`         | (creates its own) | External `useFetcher()`. **MUST** be a separate one per form when multiple forms share a page.          |
| `method`          | `"POST"`          | HTTP method.                                                                                            |
| `action`          | `undefined`       | Action URL (e.g. `"/login"`). Overridable per `submit()` call.                                          |
| `encType`         | `undefined`       | `multipart/form-data` for file uploads.                                                                 |
| `replace`         | `false`           | Passed to `navigate` together with `navigateTo`.                                                        |
| `preventMultiple` | `true`            | Blocks `submit()` while `isSubmitting === true` / fetcher submitting. Disable only for background save. |
| `navigateTo`      | `undefined`       | Redirect after success — reduces boilerplate.                                                           |
| `navigateOptions` | `undefined`       | `{ replace, state }` for `navigate`.                                                                    |
| `onSuccess`       | `undefined`       | `(result: TData) => void \                                                                              |
| `onError`         | `undefined`       | `(errors) => void \                                                                                     |
| `onFinally`       | `undefined`       | `() => void` — always runs after the request.                                                           |
| `schema`          | `undefined`       | `z.ZodSchema` — client-side validation before sending.                                                  |

### Automatic error translation — resolve once, never twice

The hook passes every error (client-side Zod issues and server `errors.general` / field errors) through `getMessageByKey` before they reach the UI:

- Server sends hardcoded EN strings → `getMessageByKey` finds no key → returns input as-is (idempotency) → already human-readable. **Correct** behavior.
- Server sends a key or serialized key (`KEY|param=value`) → resolved from `en_server_errors.json` with interpolation.
- In JSX render `errors.general` / `errors.field` **directly** — wrapping in `getMessageByKey` again double-processes.
- **Exception:** a toast fired manually inside `onError` is outside the hook's render stream — there `getMessageByKey(errors.general)` is the pattern (see `settings.tsx`).

```
Server: formError({ general: "SOMETHING_WRONG", email: "Invalid email format" })
  → fetcher.data = { success: false, errors: {...} }
  → hook: getMessageByKey on each value
  → errors state = { general: "Something went wrong", email: "Invalid email format" }
  → component: {errors.general} / {errors.email}
```

### Worked example — client (login)

`app/routes/auth/login.tsx`:

```tsx
import { LoginSchema } from "@/validators";

import { useFetcher } from "react-router";

import { useSubmitAction } from "#/lib/router";

type Inputs = { email: string; password: string; remember: string };

export default function Index() {
  const fetcher = useFetcher();

  const { submit, isSubmitting, errors, success } = useSubmitAction<Inputs>({
    fetcher,
    navigateTo: "/",
    schema: LoginSchema,
    onSuccess: () => trackEvent("login", "auth", "email")
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    submit(formData, { method: "POST", action: "/login" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormField name="email" errorMessage={errors?.email} />
      <FormField name="password" type="password" errorMessage={errors?.password} />
      {errors?.general && <p>{errors.general}</p>}
      <Button type="submit" state={isSubmitting ? "loading" : "default"} disabled={isSubmitting}>
        Login
      </Button>
    </form>
  );
}
```

Key points: `fetcher` passed to the hook, `schema: LoginSchema` validates client-side, `navigateTo: "/"` redirects on success, the button gets `state` + `disabled` from `isSubmitting`.

### Multiple forms on one page

Each hook needs a **separate `useFetcher()`**, otherwise one form's submit overwrites the other's state:

```tsx
// app/routes/admin/users.$userId.tsx
const rightsForm = useSubmitAction<{ userName: string; general?: string }>({
  action: `/admin/users/${user.user_id}`,
  onSuccess: (result) => setSetupData(result),
  onError: (errors) => {
    if (errors?.general) toast.error(getMessageByKey(errors.general));
  }
});

const deleteForm = useSubmitAction<{ userId: string; general?: string }>({
  action: `/admin/users/${user.user_id}`
});
const banForm = useSubmitAction<{ userId: string; general?: string }>({
  action: `/admin/users/${user.user_id}`
});
```

Each form has independent `isSubmitting` / `errors` / `result`. The `action` is shared — differentiation via typed submit (`_type`).

## Typed submit (multi-action)

- **Location:** `shared/utils/typed-submit.ts` — import `@/utils/typed-submit` or `@/utils`.
- Multiple handlers in one route `action`, differentiated by the `_type` field (constant `SUBMIT_TYPE_KEY`).
- Works with `useSubmitAction` (submits to one endpoint) or raw `useFetcher`/`useSubmit`.

### Functions

- `createTypedSubmit<T extends string>(type, data?)` — builds `FormData` with `_type` + optional payload. `File` lands as-is, objects as `JSON.stringify`, rest as `String(value)`; `null`/`undefined` omitted.
- `parseTypedSubmit<T>(request)` — async → `ParsedTypedSubmit<T> | null` (`{ type, data, formData }`). `null` when no `_type` or not a string.
- `parseTypedSubmitFromFormData<T>(formData)` — sync, from existing `FormData`.
- `isSubmitType<T>(result, type)` — type guard narrowing `result.type` outside a switch.

### Worked example — client

```tsx
import { createTypedSubmit } from "@/utils/typed-submit";

const rightsForm = useSubmitAction<{ admin?: boolean }>({
  action: `/admin/users/${user.user_id}`
});

const handleAdminToggle = (checked: boolean) => {
  rightsForm.submit(createTypedSubmit("grant-rights", { admin: String(checked) }));
};
```

Empty payload: `createTypedSubmit("delete-user", {})` — just `_type`. With payload: data lands in `FormData` alongside `_type`.

### Worked example — server (dispatch)

`app/routes/admin/users.$userId.server.tsx`:

```tsx
import { parseTypedSubmit } from "@/utils/typed-submit";
import { createRouteService, actionMethod, type RouteActionArgs } from "$/lib/decorators";

class RouteService extends BaseService {
  @actionMethod({ general: "FAILED_TO_UPDATE_USER_RIGHTS" })
  async updateRights(userId: string, data: Record<string, unknown>) {
    const admin = data.admin === "true" || data.admin === "1";
    return this.admin.grantRights(userId, {
      admin: data.admin !== undefined ? admin : undefined
    });
  }

  @actionMethod({ general: "FAILED_TO_DELETE_USER" })
  async removeUser(userId: string) {
    return this.admin.deleteUser(userId);
  }
}

export async function action({ context, request }: RouteActionArgs) {
  const route = createRouteService(RouteService, context, request);
  const result = await parseTypedSubmit(request);

  if (!result) {
    return data(route.formError({ general: "Invalid action" }));
  }

  switch (result.type) {
    case "grant-rights":
      return data(await route.updateRights(userId, result.data));
    case "delete-user":
      return data(await route.removeUser(userId));
    default:
      return data(route.formError({ general: "Unknown action" }));
  }
}
```

Dispatch rules:

- **Always handle `null`** from `parseTypedSubmit` with `formError({ general: "Invalid action" })` before the switch.
- **Always keep `default`** in the switch → `formError({ general: "Unknown action" })`. Without it an unknown `_type` returns `undefined` and silently breaks the UI — the default is the only safety net for future union members.
- `result.data` is `Record<string, string | File>` — pass it to the service **as-is**; Zod validates in `@actionMethod` (`Validator.validateData`), not in the route. The route only dispatches.
- Dispatch logic stays in the `action`; business logic in `RouteService` / `context.services.*`.

## Validation — client + server

### Schemas in `shared/validators/`

- Location: `shared/validators/*.ts` (e.g. `auth.ts`), re-exported from `shared/validators/index.ts`, imported via `@/validators` (available to app and server).
- Schemas use `zod` (`z.object`) — one runtime validator shared by client and server.
- Limits (min/max/pattern) read from `shared/validators/*-rules.json` — single source of truth; messages interpolate them via template literals.

**Dual validation:** client-side (`schema` in the hook) is UX — instant feedback, invalid data never hits the network. Server-side in `@actionMethod` (`Validator.validateForm(this.request, Schema)` or `Validator.validateData(data, schema)`) is **mandatory and authoritative** — the client can be bypassed (disabled JS, edited requests). Never duplicate a schema: the same `LoginSchema` is imported on both sides.

`if (!Validator.isSuccess(result)) this.throw(result.errors as FormErrors)` — `@actionMethod` catches the throw and returns `formError(errors)`.

## Pending states

`isSubmitting` drives the button's loading state and disable:

```tsx
<Button type="submit" state={isSubmitting ? "loading" : "default"} disabled={isSubmitting}>
  Login
</Button>
```

- `state="loading"` → the `Button` component shows a spinner/overlay (→ `components.md`).
- `disabled={isSubmitting}` + `preventMultiple: true` — a second `submit()` is ignored.
- `isSubmitting` is synced with `fetcher.state !== "idle"` — no manual reset needed.
- Multi-form sections: pass `isSubmitting` down — `<DeleteSection isSubmitting={deleteForm.isSubmitting} />` — each section has independent pending state.

## Don't

- Don't skip `default` in the typed-submit switch — unknown `_type` must return `formError`.
- Don't skip server-side validation — client `schema` is UX, not security.
- Don't use raw `fetch` for forms — bypasses React Router (navigation, revalidation, `useActionData`) and requires manual `FormResponseResult` parsing.
- Don't forget to destructure and render `errors` — unhandled errors silently vanish from the UI.
- Don't duplicate schemas — one source of truth in `shared/validators/`; no inline `z.object` in a component when a schema exists.
- Don't cast `as` on typed-submit data — pass to the service, let Zod validate.
- Don't wrap hook `errors` in `getMessageByKey` in JSX — already translated (exception: manual toasts in `onError`).
- Don't use generic `_type` names (`"submit"`, `"action"`) — descriptive (`"update-profile"`, `"delete-account"`); a typo silently falls to `default`.
- Don't share one `useFetcher()` between forms on the same page.
