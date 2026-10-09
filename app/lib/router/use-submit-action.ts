import * as React from "react";
import { useFetcher, useNavigate } from "react-router";

import { getMessageByKey } from "@/utils/messages";

import type { FormResponseResult } from "$/services/base";
import type { z } from "zod";

/**
 * Configuration options for useSubmitAction hook
 * @template TData - Type of successful response data
 * @template TInputs - Type of form inputs for error mapping
 */
export type UseSubmitActionOptions<TData = any, TInputs = any> = {
  // Submission options
  fetcher?: ReturnType<typeof useFetcher<FormResponseResult<TData>>>;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  action?: string;
  encType?: "application/x-www-form-urlencoded" | "multipart/form-data";
  replace?: boolean;
  preventMultiple?: boolean;

  // Response handlers
  onSuccess?: (result: TData) => void | Promise<void>;
  onError?: (
    errors: Partial<Record<keyof TInputs, string>> & { general?: string }
  ) => void | Promise<void>;
  onFinally?: () => void;

  // Navigation options
  navigateTo?: string;
  navigateOptions?: { replace?: boolean; state?: any };

  // Client-side validation options
  schema?: z.ZodSchema<any>;
};

/**
 * Return type for useSubmitAction hook
 * @template TData - Type of successful response data
 * @template TInputs - Type of form inputs for error mapping
 */
export type UseSubmitActionReturn<TData = any, TInputs = any> = {
  submit: (
    data: FormData | Record<string, any>,
    options?: Partial<UseSubmitActionOptions<TData, TInputs>>
  ) => void;
  isSubmitting: boolean;
  errors: Partial<Record<keyof TInputs, string>> & { general?: string };
  result: TData | null;
  success: boolean;
  reset: () => void;
  fetcher: ReturnType<typeof useFetcher<FormResponseResult<TData>>>;
};

/**
 * Unified hook for handling form submissions with React Router fetcher
 * Combines submission logic, response handling, and navigation in one place
 */
export function useSubmitAction<TData = any, TInputs = any>(
  options: UseSubmitActionOptions<TData, TInputs> = {}
): UseSubmitActionReturn<TData, TInputs> {
  const {
    fetcher: externalFetcher,
    method = "POST",
    action,
    encType,
    replace = false,
    preventMultiple = true,
    onSuccess,
    onError,
    onFinally,
    navigateTo,
    navigateOptions,
    schema
  } = options;

  // Use external fetcher if provided, otherwise create a new one
  const internalFetcher = useFetcher<FormResponseResult<TData>>();
  const fetcher = externalFetcher || internalFetcher;
  const navigate = useNavigate();

  // State management
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof TInputs, string>> & { general?: string }
  >({});
  const [result, setResult] = React.useState<TData | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Derived from the fetcher lifecycle — no setState-in-effect needed
  const isSubmitting = fetcher.state !== "idle";

  // Refs to prevent multiple submissions and track previous data
  const isSubmittingRef = React.useRef(false);
  const previousDataRef = React.useRef<FormResponseResult<TData> | undefined>(undefined);
  const pendingNavigationRef = React.useRef<{
    to: string;
    options?: { replace?: boolean; state?: any };
  } | null>(null);

  // Keep callbacks/options in refs so the response effect only runs when fetcher.data changes
  const onSuccessRef = React.useRef(onSuccess);
  const onErrorRef = React.useRef(onError);
  const onFinallyRef = React.useRef(onFinally);
  const navigateToRef = React.useRef(navigateTo);
  const navigateOptionsRef = React.useRef(navigateOptions);
  const replaceRef = React.useRef(replace);

  React.useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onFinallyRef.current = onFinally;
    navigateToRef.current = navigateTo;
    navigateOptionsRef.current = navigateOptions;
    replaceRef.current = replace;
  });

  // Handle form submission
  const submit = React.useCallback(
    (
      data: FormData | Record<string, any>,
      submitOptions: Partial<UseSubmitActionOptions<TData, TInputs>> = {}
    ) => {
      // Convert plain object to FormData if needed
      const formData =
        data instanceof FormData
          ? data
          : (() => {
              const fd = new FormData();
              Object.entries(data).forEach(([key, value]) => {
                // Skip null and undefined values
                if (value !== null && value !== undefined) {
                  fd.append(key, String(value));
                }
              });
              return fd;
            })();

      // Client-side Zod schema validation if provided
      const schemaToUse = submitOptions.schema || schema;
      if (schemaToUse) {
        const objectData: Record<string, any> = {};
        formData.forEach((value, key) => {
          objectData[key] = value;
        });

        const validationResult = schemaToUse.safeParse(objectData);
        if (!validationResult.success) {
          const formattedErrors: Record<string, string> = {};
          validationResult.error.issues.forEach((issue) => {
            const fieldName = issue.path[0];
            if (fieldName && typeof fieldName === "string" && !(fieldName in formattedErrors)) {
              formattedErrors[fieldName] = issue.message;
            }
          });

          // Translate errors using getMessageByKey
          const translatedErrors: Record<string, string> = {};
          Object.entries(formattedErrors).forEach(([errKey, errValue]) => {
            translatedErrors[errKey] = getMessageByKey(errValue);
          });

          setErrors(
            translatedErrors as Partial<Record<keyof TInputs, string>> & {
              general?: string;
            }
          );
          setResult(null);
          setSuccess(false);

          if (onErrorRef.current) {
            onErrorRef.current(
              translatedErrors as Partial<Record<keyof TInputs, string>> & {
                general?: string;
              }
            );
          }

          isSubmittingRef.current = false;
          return;
        }
      }

      // Prevent multiple submissions if enabled
      if (preventMultiple && (isSubmittingRef.current || fetcher.state === "submitting")) {
        return;
      }

      // Update submission state
      isSubmittingRef.current = true;
      pendingNavigationRef.current = null;
      setErrors({});
      setResult(null);
      setSuccess(false);

      // Submit the form
      fetcher.submit(formData, {
        method: (submitOptions.method || method) as any,
        action: submitOptions.action || action,
        encType: (submitOptions.encType || encType) as any
      });
    },
    [fetcher, method, action, encType, preventMultiple, schema]
  );

  // Handle response changes
  React.useEffect(() => {
    // Skip if no data
    if (!fetcher.data) {
      previousDataRef.current = undefined;
      return;
    }

    // Skip if data hasn't changed
    if (fetcher.data === previousDataRef.current) {
      return;
    }

    // Mark this data as processed immediately so concurrent/strict-mode re-runs
    // cannot trigger the handlers a second time before async work finishes.
    previousDataRef.current = fetcher.data;

    // Process the response directly - fetcher.data should already be the result from action
    const processResponse = async () => {
      try {
        if (fetcher.data?.success) {
          // Handle success response
          setResult(fetcher.data.result || null);
          setSuccess(true);
          setErrors({});

          // Call success handler if provided
          if (onSuccessRef.current && fetcher.data.result) {
            await onSuccessRef.current(fetcher.data.result);
          }

          // Queue navigation for after the fetcher settles — navigating while
          // post-submit revalidation is still in flight can leave the URL
          // updated but the previous route's UI on screen.
          if (navigateToRef.current) {
            pendingNavigationRef.current = {
              to: navigateToRef.current,
              options: {
                replace: replaceRef.current,
                ...navigateOptionsRef.current
              }
            };
          }
        } else if (!fetcher.data?.success && fetcher.data?.errors) {
          // Handle error response - translate errors automatically
          const rawErrors = fetcher.data.errors;
          const translatedErrors: Record<string, string> = {};
          Object.entries(rawErrors).forEach(([errKey, errValue]) => {
            if (typeof errValue === "string") {
              translatedErrors[errKey] = getMessageByKey(errValue);
            } else {
              translatedErrors[errKey] = String(errValue);
            }
          });

          setErrors(
            translatedErrors as Partial<Record<keyof TInputs, string>> & {
              general?: string;
            }
          );
          setResult(null);
          setSuccess(false);

          // Call error handler if provided
          if (onErrorRef.current) {
            await onErrorRef.current(
              translatedErrors as Partial<Record<keyof TInputs, string>> & {
                general?: string;
              }
            );
          }
        }
      } catch (error) {
        console.error("Error in form response handler:", error);
      } finally {
        // Always run finally handler
        if (onFinallyRef.current) {
          await onFinallyRef.current();
        }

        // Reset submission ref
        isSubmittingRef.current = false;
      }
    };

    processResponse();
  }, [fetcher.data, navigate]);

  // Flush queued navigation once the fetcher is idle — every render, since
  // the queue may be filled either during "loading" or already-idle states.
  React.useEffect(() => {
    if (pendingNavigationRef.current && fetcher.state === "idle") {
      const pending = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      navigate(pending.to, pending.options);
    }
  });

  // Reset function
  const reset = React.useCallback(() => {
    isSubmittingRef.current = false;
    pendingNavigationRef.current = null;
    setErrors({});
    setResult(null);
    setSuccess(false);
    previousDataRef.current = undefined;
  }, []);

  return {
    submit,
    isSubmitting,
    errors,
    result,
    success,
    reset,
    fetcher
  };
}
