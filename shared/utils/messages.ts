import enServerErrors from "../locales/en_server_errors.json";

export type MessageKey = keyof typeof enServerErrors;

/**
 * A type representing a valid MessageKey, optionally followed by inline serialized parameters.
 * E.g. "USER_DELETED_SUCCESSFULLY" or "USER_DELETED_SUCCESSFULLY|name=user"
 */
export type SerializedMessageKey = MessageKey | `${MessageKey}|${string}`;

/**
 * Returns the localized message for the given server error key.
 *
 * Lookup is ONLY in en_server_errors.json (shared with mobile). Client-side
 * messages (toasts, validation feedback) are hardcoded directly in the web app
 * as string literals — they do NOT go through this function.
 *
 * Supports placeholder interpolation by passing a params object or using inline
 * serialized format (e.g. "KEY|param=value").
 * If the key doesn't exist, it returns the fallback or the key itself.
 */
export function getMessageByKey(
  keyInput: string,
  paramsOrFallback?: Record<string, string | number> | string,
  fallback?: string
): string {
  let params: Record<string, string | number> = {};
  let actualFallback = fallback;

  if (typeof paramsOrFallback === "string") {
    actualFallback = paramsOrFallback;
  } else if (paramsOrFallback) {
    params = { ...params, ...paramsOrFallback };
  }

  if (!keyInput || typeof keyInput !== "string") {
    return actualFallback ?? "";
  }

  const trimmedInput = keyInput.trim();
  let key = trimmedInput;

  // 1. Support serialized key format: "KEY|param1=value1|param2=value2"
  if (trimmedInput.includes("|")) {
    const parts = trimmedInput.split("|");
    key = parts[0].trim();
    parts.slice(1).forEach((part) => {
      const equalsIndex = part.indexOf("=");
      if (equalsIndex !== -1) {
        const pKey = part.substring(0, equalsIndex).trim();
        const pVal = part.substring(equalsIndex + 1);
        params[pKey] = pVal;
      }
    });
  }

  let message: string;
  if (
    Object.prototype.hasOwnProperty.call(enServerErrors, key) &&
    typeof (enServerErrors as Record<string, string>)[key] === "string" &&
    (enServerErrors as Record<string, string>)[key].trim().length > 0
  ) {
    message = (enServerErrors as Record<string, string>)[key];
  } else {
    return actualFallback ?? key;
  }

  Object.entries(params).forEach(([paramKey, paramValue]) => {
    const regex = new RegExp(`{${paramKey}}`, "g");
    message = message.replace(regex, String(paramValue));
  });

  return message;
}

/**
 * Type guard to check if a value is a valid translation key.
 */
export function isMessageKey(value: unknown): value is MessageKey {
  return typeof value === "string" && value in enServerErrors;
}
