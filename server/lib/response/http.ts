import { resolveMessage } from "./messages";

export const responses = {
  getNoAccess(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "NO_ACCESS", {
      status: 403,
      statusText: "Forbidden"
    });
  },
  getUnauthorized(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "UNAUTHORIZED", {
      status: 401,
      statusText: "Unauthorized"
    });
  },
  getNotFound(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "RESOURCE_NOT_FOUND", {
      status: 404,
      statusText: "Not Found"
    });
  },
  getBadRequest(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "BAD_REQUEST", {
      status: 400,
      statusText: "Bad Request"
    });
  },
  getConflict(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "CONFLICT", {
      status: 409,
      statusText: "Conflict"
    });
  },
  getUnprocessableEntity(errors: Record<string, string> & { general?: string }): Response {
    return new Response(JSON.stringify({ success: false, errors }), {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  getInternalError(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "INTERNAL_SERVER_ERROR", {
      status: 500,
      statusText: "Internal Server Error"
    });
  },
  getServiceUnavailable(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "SERVICE_UNAVAILABLE", {
      status: 503,
      statusText: "Service Unavailable"
    });
  },
  getTooManyRequests(message?: string | { general?: string }): Response {
    return new Response(resolveMessage(message) || "RATE_LIMIT_EXCEEDED", {
      status: 429,
      statusText: "Too Many Requests"
    });
  },
  json<T>(data: T, status: number = 200, statusText?: string): Response {
    return new Response(JSON.stringify(data), {
      status,
      statusText: statusText || (status >= 200 && status < 300 ? "OK" : "Error"),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  success<T>(data: T): Response {
    return this.json(data, 200, "OK");
  },
  created<T>(data: T): Response {
    return this.json(data, 201, "Created");
  },
  noContent(): Response {
    return new Response(null, {
      status: 204,
      statusText: "No Content"
    });
  }
};
