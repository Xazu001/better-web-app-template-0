/**
 * Shared form-response types matching `server/lib/response/form.ts`.
 * Kept in `shared/` so both app and server can reference them.
 */

export type FormErrors = Record<string, string> & {
  general?: string;
};

export type FormResponseError = {
  success: false;
  errors: FormErrors;
};

export type FormResponseSuccess<T = unknown> = {
  success: true;
  result: T;
};

export type FormResponseResult<T = unknown> = FormResponseError | FormResponseSuccess<T>;

/**
 * Extracts the raw (untranslated) `FormErrors` from a fetcher response,
 * narrowing the union so `errors` is only accessed on the error variant.
 *
 * Returns `undefined` when the response is missing or successful.
 */
export function getRawErrors<T>(data: FormResponseResult<T> | undefined): FormErrors | undefined {
  if (!data || data.success) return undefined;
  return data.errors;
}
