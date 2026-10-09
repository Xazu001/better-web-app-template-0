# Localization (L10n) — rules

> Auto-resolution of errors in `useSubmitAction` → `submit.md`. Server-side `getMessage()` + `FormErrors` → `server.md`.

The web app is **English-only**. There is no multi-language system on the client side — there is no client JSON bundle or i18n library. The only localized resource is `shared/locales/en_server_errors.json` (server error keys).

## Key rule: two types of messages

- **Server errors** — keys in `shared/locales/en_server_errors.json`, resolved client-side via `getMessageByKey()`.
- **Client messages** (toasts, validation, UI labels) — **hardcoded TS/TSX strings**, NOT `getMessageByKey`, NOT JSON.
- **Route handlers** (`.server.tsx`) and services — send **hardcoded English strings** in `formError()` / `responses.*()`, NOT translation keys.
  - Exception: when the server sends a serialized key for client-side resolution (e.g. `"RATE_LIMIT_EXCEEDED_RETRY|retryAfter=60"`).

## What to hardcode where

```tsx
// Client — toast/UI → hardcoded string
toast.success("Name updated!");
toast.error(`Image too small. Minimum ${MIN_DIM}x${MIN_DIM}px.`);

// Client — error from server (dynamic) → getMessageByKey
toast.error(getMessageByKey(errors.general));

// Route handler / service → hardcoded English string, NOT key
return data(route.formError({ general: "Not authenticated" }));
this.throw({ general: "Failed to update user" });
```

Do NOT use `getMessageByKey` for client messages.
Do NOT send translation keys from route handlers (unless it's a serialized key — see below).

## Locale file structure

The `shared/locales/` directory contains **one** file:

```
shared/locales/
  en_server_errors.json   # server error keys (EN)
```

`en_server_errors.json` is a flat `KEY -> "English message"` object (no nesting, no namespaces). Keys are `UPPER_SNAKE_CASE`, sorted alphabetically. Values may contain `{name}` placeholders for parameter interpolation, e.g.:

```json
"INVALID_INTEGER_PARAMETER": "Invalid integer parameter: {name}",
"PARAMETER_REQUIRED": "Parameter {name} is required",
"RATE_LIMIT_EXCEEDED_RETRY": "Too many requests. Please try again in {retryAfter} second(s)."
```

There are no other locale files, no per-language directories, no client-side UI message bundle.

## File architecture

| File                                   | Role                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/locales/en_server_errors.json` | Server error keys. Source of truth for keys.                                                                                                                            |
| `shared/utils/messages.ts`             | `getMessageByKey()` (client) + types `MessageKey`, `SerializedMessageKey`, `isMessageKey`.                                                                              |
| `server/lib/response/messages.ts`      | `getMessage()` (server, accessor to the same JSON), `resolveMessage()`, re-export `messages`/`isMessageKey`/types.                                                      |
| `server/lib/response/form.ts`          | `FormErrors` (`Record<string, string> & { general?: string }`), `formError()`, `FormResponseResult`. The `general` field typed as `string`, NOT `SerializedMessageKey`. |
| `server/lib/response/http.ts`          | `responses.*()` — accepts `string` (e.g. `getTooManyRequests(message?: string \                                                                                         |

## `getMessageByKey` — contract

Source: `shared/utils/messages.ts`. Client import: `import { getMessageByKey } from "@/utils";` (re-exported via `shared/utils/index.ts`).

```ts
function getMessageByKey(
  keyInput: string,
  paramsOrFallback?: Record<string, string | number> | string,
  fallback?: string
): string;
```

The second argument is polymorphic — distinguished by shape: object with keys → params; string → fallback. The third arg is always `fallback` (when params provided in the object).

### Lookup order

1. If `keyInput` contains `|`, parse inline params `KEY|param=value|param2=value2` → split into `key` + `params`.
2. Look up `key` in `en_server_errors.json`.
3. If found, interpolate `{param}` placeholders in the value (from inline params and/or params object — object overrides inline).
4. Return the result.
5. If NOT found: return `fallback` (if provided) or **raw `keyInput`** (including params).

### Worked examples

```ts
// 1. Simple key, no params
getMessageByKey("USER_NOT_FOUND");
// → "User not found"

// 2. Serialized key (inline params) — typical case from server
getMessageByKey("RATE_LIMIT_EXCEEDED_RETRY|retryAfter=60");
// → parses retryAfter=60 → interpolates {retryAfter}
// → "Too many requests. Please try again in 60 second(s)."

// 3. Key + params programmatically (object)
getMessageByKey("PARAMETER_REQUIRED", { name: "userId" });
// → "Parameter userId is required"

// 4. Key + fallback
getMessageByKey("UNKNOWN_KEY", "Fallback message");
// → "Fallback message"

// 5. Unknown key, no fallback
getMessageByKey("UNKNOWN_KEY");
// → "UNKNOWN_KEY" (raw)

// 6. Unknown key with inline params, no fallback
getMessageByKey("FOO|x=1");
// → "FOO|x=1" (entire input, NOT extracted "FOO")
//    Fallback covers only missing entry, not syntax errors.

// 7. Plain EN string (non-key, no |) — idempotency
getMessageByKey("Not authenticated");
// → "Not authenticated" (not found in JSON → input as-is)
```

### Key properties

- Resolves **ONLY** keys from `en_server_errors.json`. There is no concept of a "client message key" — `getMessageByKey` won't find it.
- **Idempotency:** calling on a plain English string (non-key, no `|`) → not found → return input as-is. That's why hardcoded strings from the server pass through `getMessageByKey` untouched — this is **correct** behavior, the basis of auto-resolution in `useSubmitAction`.
- **A key not in JSON but with params** → returns the entire input (e.g. `"FOO|x=1"`), NOT extracted `FOO`.

## Serialized keys (server error key serialization)

Format: `KEY|name1=value1|name2=value2`. The server sends a key with inline params as a **single string** in `errors.general` (or a field-level field). The client resolves it without additional arguments — params are embedded in the string.

### How it's created on the server side

In services (e.g. `server/services/base.ts`) rate-limit builds the key via template literal:

```ts
// Throw (GET / page-level) — goes to responses.getTooManyRequests
throw this.responses.getTooManyRequests(
  `RATE_LIMIT_EXCEEDED_RETRY|retryAfter=${result.retryAfter}`
);

// Form result (POST / mutation) — goes to errors.general
return new RateLimitFormResult(false, {
  general: `RATE_LIMIT_EXCEEDED_RETRY|retryAfter=${result.retryAfter}`
});
```

### Resolution on the client side

- In `en_server_errors.json` the value contains `{name}` placeholders: `"Too many requests. Please try again in {retryAfter} second(s)."`.
- `getMessageByKey("RATE_LIMIT_EXCEEDED_RETRY|retryAfter=60")` → parses `retryAfter=60`, interpolates `{retryAfter}` → the resolved message.
- You can also pass params programmatically: `getMessageByKey("RATE_LIMIT_EXCEEDED_RETRY", { retryAfter: 60 })` — then no inline params, params from the object.
- **Note:** the `|` character in parameter values is not escaped — treated as a separator. Values should not contain `|`. Similarly, the `=` character in a parameter name is not supported (split on the first `=` in the segment).

## `useSubmitAction` — auto-resolution

- The hook automatically calls `getMessageByKey()` on `errors.general` **and** on each field-level error value returned by the server, before they reach the UI. The component doesn't need to resolve manually.
- Since route handlers send hardcoded EN strings (not keys), `getMessageByKey` doesn't find them in JSON → returns input as-is → the string is already human-readable. This is **correct** behavior, not an error.
- If the server sends a serialized key (`KEY|param=value`), `getMessageByKey` resolves it from `en_server_errors.json` and replaces it with the interpolated message.
- **Consequence:** you must not manually resolve a second time in the component what `useSubmitAction` already handled — you'll get double processing (usually harmless due to idempotency, but confusing). Render `errors.general` directly:

```tsx
<AlertDescription>{getMessageByKey(errors.general)}</AlertDescription>;
// or in a toast:
toast.error(getMessageByKey(errors.general));
```

## How to add a new server error key

1. **JSON:** Add an entry to `shared/locales/en_server_errors.json` — `UPPER_SNAKE_CASE` key, alphabetically in the right place. EN value, optionally with `{name}` placeholders.
2. **Server:** Use on the server side — send a hardcoded EN string (`this.throw({ general: "Hardcoded English message" })`) OR send a serialized key for client-side resolution (`general: "RATE_LIMIT_EXCEEDED_RETRY|retryAfter=60"`).
3. **Client:** Use `getMessageByKey(errors.general)` (or field-level) in TSX — don't hardcode a duplicate EN string in the component. If `useSubmitAction` already resolves this field, don't call `getMessageByKey` a second time.
4. **Don't hardcode** client strings (UI, toast, labels) in TSX via JSON — these are always plain string literals. `getMessageByKey` is exclusively for resolving server errors.

## Hard constraints

- Web = EN-only, no multi-language system.
- Client strings (toast, UI, validation) = hardcoded literals in TS/TSX, no JSON bundle.
- `getMessageByKey` = only keys from `en_server_errors.json`; unknown → fallback or raw input (idempotent on plain EN strings).
- `FormErrors.general` and `responses.*()` typed as `string` — any EN string OK; a serialized key is also a string.
- Don't manually resolve a second time what `useSubmitAction` already handled.
