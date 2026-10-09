import type {
  FormErrors,
  FormResponseError,
  FormResponseResult,
  FormResponseSuccess
} from "@/utils/form-response";

export type { FormErrors, FormResponseError, FormResponseResult, FormResponseSuccess };

export function formSuccess<T>(result: T): FormResponseSuccess<T> {
  return { success: true, result };
}

export function formError(errors: FormErrors): FormResponseError {
  return { success: false, errors };
}

export function isFormResponseError(value: unknown): value is FormResponseError {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false &&
    "errors" in value
  );
}

export class RateLimitFormResult {
  constructor(
    public readonly success: boolean,
    public readonly errors?: FormErrors
  ) {}

  get isSuccess(): boolean {
    return this.success;
  }

  get isError(): boolean {
    return !this.success;
  }

  getError(): FormResponseError {
    return {
      success: false,
      errors: this.errors || { general: "RATE_LIMIT_EXCEEDED" }
    };
  }
}
