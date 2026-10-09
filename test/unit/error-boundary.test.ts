import { describe, expect, it } from "vitest";

import { resolveRouteError } from "#/lib/router/error";
import { getMessageFromResponse } from "$/lib/response/extract";
import { getMessageByKey } from "@/utils/messages";

describe("getMessageByKey", () => {
  it("resolves exact translation keys from en_server_errors.json", () => {
    expect(getMessageByKey("USER_NOT_FOUND")).toBe("User not found");
    expect(getMessageByKey("ADMIN_ACCESS_REQUIRED")).toBe("You don't have access to this page");
    expect(getMessageByKey("LOGIN_REQUIRED")).toBe("You must be logged in to access this page!");
    expect(getMessageByKey("RESOURCE_NOT_FOUND")).toBe("Resource not found");
    expect(getMessageByKey("NO_ACCESS")).toBe("No access");
    expect(getMessageByKey("UNAUTHORIZED")).toBe("Unauthorized");
    expect(getMessageByKey("INTERNAL_SERVER_ERROR")).toBe("Internal Server Error");
  });

  it("resolves serialized keys with inline parameters", () => {
    expect(getMessageByKey("RATE_LIMIT_EXCEEDED_RETRY|retryAfter=45")).toBe(
      "Too many requests. Please try again in 45 second(s)."
    );
    expect(getMessageByKey("INVALID_INTEGER_PARAMETER|name=page")).toBe(
      "Invalid integer parameter: page"
    );
  });

  it("resolves keys with parameter objects", () => {
    expect(getMessageByKey("PARAMETER_REQUIRED", { name: "userId" })).toBe(
      "Parameter userId is required"
    );
  });

  it("handles whitespace around keys", () => {
    expect(getMessageByKey("  USER_NOT_FOUND  ")).toBe("User not found");
  });

  it("returns fallback when key is not found and fallback is provided", () => {
    expect(getMessageByKey("UNKNOWN_KEY_XYZ", "Custom fallback")).toBe("Custom fallback");
  });

  it("returns key when key is not found and no fallback is provided", () => {
    expect(getMessageByKey("UNKNOWN_KEY_XYZ")).toBe("UNKNOWN_KEY_XYZ");
    expect(getMessageByKey("UNKNOWN_KEY_XYZ|param=123")).toBe("UNKNOWN_KEY_XYZ");
  });

  it("is idempotent for hardcoded English strings", () => {
    const rawString = "You don't have access to edit this item!";
    expect(getMessageByKey(rawString)).toBe(rawString);
  });

  it("safely handles falsy and non-string inputs", () => {
    expect(getMessageByKey(undefined as any)).toBe("");
    expect(getMessageByKey(null as any)).toBe("");
    expect(getMessageByKey("" as any)).toBe("");
    expect(getMessageByKey(undefined as any, "Fallback")).toBe("Fallback");
  });
});

describe("resolveRouteError", () => {
  function createRouteErrorResponse(status: number, data: unknown, statusText = "") {
    return {
      status,
      statusText,
      data,
      internal: false
    };
  }

  it("resolves a 404 RouteErrorResponse with a server error key", () => {
    const error = createRouteErrorResponse(404, "USER_NOT_FOUND", "Not Found");
    const result = resolveRouteError(error);

    expect(result.code).toBe("404");
    expect(result.statusText).toBe("Not Found");
    expect(result.title).toBe("Page Not Found");
    expect(result.message).toBe("User not found");
  });

  it("resolves a 403 RouteErrorResponse with an access key", () => {
    const error = createRouteErrorResponse(403, "ADMIN_ACCESS_REQUIRED", "Forbidden");
    const result = resolveRouteError(error);

    expect(result.code).toBe("403");
    expect(result.statusText).toBe("Forbidden");
    expect(result.title).toBe("Access Denied");
    expect(result.message).toBe("You don't have access to this page");
  });

  it("resolves a 429 RouteErrorResponse with a serialized rate limit key", () => {
    const error = createRouteErrorResponse(
      429,
      "RATE_LIMIT_EXCEEDED_RETRY|retryAfter=60",
      "Too Many Requests"
    );
    const result = resolveRouteError(error);

    expect(result.code).toBe("429");
    expect(result.statusText).toBe("Too Many Requests");
    expect(result.title).toBe("Too Many Requests");
    expect(result.message).toBe("Too many requests. Please try again in 60 second(s).");
  });

  it("cleans up React Router internal 404 unmatched route error string", () => {
    const error = createRouteErrorResponse(
      404,
      'Error: No route matches URL "/some/missing/route"',
      "Not Found"
    );
    const result = resolveRouteError(error);

    expect(result.code).toBe("404");
    expect(result.title).toBe("Page Not Found");
    expect(result.message).toBe("Resource not found");
  });

  it("falls back to status-based default key when error data is empty or missing", () => {
    const error404 = createRouteErrorResponse(404, null, "Not Found");
    expect(resolveRouteError(error404).message).toBe("Resource not found");

    const error403 = createRouteErrorResponse(403, "", "Forbidden");
    expect(resolveRouteError(error403).message).toBe("No access");

    const error401 = createRouteErrorResponse(401, undefined, "Unauthorized");
    expect(resolveRouteError(error401).message).toBe("Unauthorized");

    const error500 = createRouteErrorResponse(500, null, "Internal Server Error");
    expect(resolveRouteError(error500).message).toBe("Internal Server Error");
  });

  it("extracts error keys from JSON string data", () => {
    const error = createRouteErrorResponse(
      404,
      JSON.stringify({ errors: { general: "USER_NOT_FOUND" } }),
      "Not Found"
    );
    const result = resolveRouteError(error);
    expect(result.message).toBe("User not found");
  });

  it("extracts error keys from structured object data", () => {
    const error = createRouteErrorResponse(400, { general: "BAD_REQUEST" }, "Bad Request");
    const result = resolveRouteError(error);
    expect(result.message).toBe("Bad request");

    const errorWithKeyProp = createRouteErrorResponse(
      400,
      { key: "CUSTOM_UNKNOWN_KEY" },
      "Bad Request"
    );
    expect(resolveRouteError(errorWithKeyProp).message).toBe("CUSTOM_UNKNOWN_KEY");
  });

  it("displays the key itself when key has no value in en_server_errors.json", () => {
    const error = createRouteErrorResponse(404, "CUSTOM_UNKNOWN_ERROR_KEY", "Not Found");
    const result = resolveRouteError(error);
    expect(result.message).toBe("CUSTOM_UNKNOWN_ERROR_KEY");

    const serializedError = createRouteErrorResponse(
      400,
      "ANOTHER_UNKNOWN_KEY|param=1",
      "Bad Request"
    );
    expect(resolveRouteError(serializedError).message).toBe("ANOTHER_UNKNOWN_KEY");
  });

  it("handles standard Error instances with translation keys or messages", () => {
    const errorWithKey = new Error("USER_NOT_FOUND");
    const resultWithKey = resolveRouteError(errorWithKey);
    expect(resultWithKey.code).toBe("500");
    expect(resultWithKey.message).toBe("User not found");

    const errorWithMessage = new Error("Network connection dropped");
    const resultWithMessage = resolveRouteError(errorWithMessage);
    expect(resultWithMessage.code).toBe("500");
    expect(resultWithMessage.message).toBe("Network connection dropped");

    const emptyError = new Error("");
    const resultEmpty = resolveRouteError(emptyError);
    expect(resultEmpty.message).toBe("Internal Server Error");
  });

  it("handles raw strings and unknown/falsy errors", () => {
    expect(resolveRouteError("USER_NOT_FOUND").message).toBe("User not found");
    expect(resolveRouteError(null).message).toBe("Internal Server Error");
    expect(resolveRouteError(undefined).message).toBe("Internal Server Error");
    expect(resolveRouteError({}).message).toBe("Internal Server Error");
  });
});

describe("getMessageFromResponse", () => {
  it("extracts translation key from a plain text response body", async () => {
    const response = new Response("USER_NOT_FOUND", {
      status: 404,
      statusText: "Not Found"
    });
    const message = await getMessageFromResponse(response);
    expect(message).toBe("USER_NOT_FOUND");
  });

  it("extracts message from a JSON response body with general field", async () => {
    const response = new Response(
      JSON.stringify({ errors: { general: "ADMIN_ACCESS_REQUIRED" } }),
      {
        status: 403,
        statusText: "Forbidden",
        headers: { "Content-Type": "application/json" }
      }
    );
    const message = await getMessageFromResponse(response);
    expect(message).toBe("ADMIN_ACCESS_REQUIRED");
  });

  it("extracts message from a JSON response body with message property", async () => {
    const response = new Response(JSON.stringify({ message: "Custom error message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
    const message = await getMessageFromResponse(response);
    expect(message).toBe("Custom error message");
  });

  it("falls back to statusText when body is empty", async () => {
    const response = new Response("", {
      status: 404,
      statusText: "Not Found"
    });
    const message = await getMessageFromResponse(response);
    expect(message).toBe("Not Found");
  });
});
