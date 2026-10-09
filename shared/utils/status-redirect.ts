import type { MessageKey } from "./messages";

/**
 * Options for building a status page URL.
 *
 * Mirrors `StatusProps` from `app/routes/status.tsx` — every field is optional
 * and only non-undefined values are serialized to the query string.
 */
export interface StatusRedirectOptions {
  success?: boolean;
  messageKey?: string | MessageKey;
  title?: string;
  description?: string;
  returnTo?: string;
  returnLabel?: string;
}

/**
 * Builds a status route URL with the given options serialized as query params.
 *
 * Use the returned string with `redirect()` (server loaders/actions) or
 * `navigate()` (client). The status route reads these params via
 * `useSearchParams()` — see `app/routes/status.tsx`.
 *
 * @param basePath - status route path, defaults to `/status`. Use `/admin/status`
 *   for admin-scoped redirects (renders inside the admin layout).
 */
export function buildStatusUrl(
  options: StatusRedirectOptions = {},
  basePath: string = "/status"
): string {
  const params = new URLSearchParams();

  if (options.success !== undefined) {
    params.set("success", options.success ? "true" : "false");
  }
  if (options.messageKey !== undefined) {
    params.set("key", options.messageKey);
  }
  if (options.title !== undefined) {
    params.set("title", options.title);
  }
  if (options.description !== undefined) {
    params.set("description", options.description);
  }
  if (options.returnTo !== undefined) {
    params.set("returnTo", options.returnTo);
  }
  if (options.returnLabel !== undefined) {
    params.set("returnLabel", options.returnLabel);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
