import { isRouteErrorResponse } from "react-router";

import { getMessageByKey } from "@/utils";

export interface ResolvedRouteError {
  /** Short HTTP code or indicator for DotLetters display, e.g. "404", "500" */
  code: string;
  /** HTTP status text, e.g. "Not Found", "Forbidden" */
  statusText: string;
  /** Primary headline for the error screen */
  title: string;
  /** Localized human-readable error description */
  message: string;
}

const STATUS_DEFAULT_KEYS: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "NO_ACCESS",
  404: "RESOURCE_NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMIT_EXCEEDED",
  500: "INTERNAL_SERVER_ERROR",
  503: "SERVICE_UNAVAILABLE"
};

const STATUS_DEFAULT_TEXTS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable"
};

const STATUS_TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Access Denied",
  404: "Page Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Something Bad Happened",
  503: "Service Unavailable"
};

/**
 * Safely extracts an error key or message from an unknown data payload
 * (which can be a string, JSON string, or structured object).
 */
function extractRawDataMessage(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractRawDataMessage(parsed);
      } catch {
        // Not valid JSON, treat as plain string
      }
    }
    return trimmed;
  }

  if (typeof data === "object") {
    const obj = data as Record<string, any>;
    if (typeof obj.errors === "object" && obj.errors !== null) {
      const general = obj.errors.general;
      if (typeof general === "string" && general.trim().length > 0) {
        return general.trim();
      }
    }
    if (typeof obj.general === "string" && obj.general.trim().length > 0) {
      return obj.general.trim();
    }
    if (typeof obj.key === "string" && obj.key.trim().length > 0) {
      return obj.key.trim();
    }
    if (typeof obj.code === "string" && obj.code.trim().length > 0) {
      return obj.code.trim();
    }
    if (typeof obj.message === "string" && obj.message.trim().length > 0) {
      return obj.message.trim();
    }
    if (typeof obj.error === "string" && obj.error.trim().length > 0) {
      return obj.error.trim();
    }
  }

  return null;
}

/**
 * Resolves an unknown error caught by an ErrorBoundary into structured, localized presentation data.
 */
export function resolveRouteError(error: unknown): ResolvedRouteError {
  if (isRouteErrorResponse(error)) {
    const status = error.status;
    const code = String(status);
    const statusText = error.statusText || STATUS_DEFAULT_TEXTS[status] || "Error";
    const title = STATUS_TITLES[status] || "Something Bad Happened";

    const extracted = extractRawDataMessage(error.data);

    // If React Router generated internal unmatched route text ("Error: No route matches URL...")
    // or if the extracted payload is empty, fallback to the status key.
    const isRouterInternal404 =
      status === 404 && extracted && extracted.includes("No route matches URL");

    const rawMessage =
      !extracted || isRouterInternal404
        ? STATUS_DEFAULT_KEYS[status] || "RESOURCE_NOT_FOUND"
        : extracted;

    const message = getMessageByKey(rawMessage);

    return {
      code,
      statusText,
      title,
      message
    };
  }

  if (error instanceof Error) {
    const rawMessage = error.message?.trim() || "INTERNAL_SERVER_ERROR";
    const message = getMessageByKey(rawMessage);

    return {
      code: "500",
      statusText: STATUS_DEFAULT_TEXTS[500],
      title: STATUS_TITLES[500],
      message
    };
  }

  if (typeof error === "string" && error.trim().length > 0) {
    const message = getMessageByKey(error.trim());
    return {
      code: "500",
      statusText: STATUS_DEFAULT_TEXTS[500],
      title: STATUS_TITLES[500],
      message
    };
  }

  return {
    code: "500",
    statusText: STATUS_DEFAULT_TEXTS[500],
    title: STATUS_TITLES[500],
    message: getMessageByKey("INTERNAL_SERVER_ERROR")
  };
}
