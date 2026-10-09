/**
 * Safely extracts an error message or translation key from a thrown Response object.
 * Supports both JSON response envelopes (general, message, error) and plain-text response bodies.
 */
export async function getMessageFromResponse(response: Response): Promise<string> {
  try {
    const clone = response.clone();
    const contentType = clone.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const json = (await clone.json()) as Record<string, unknown>;
      if (json && typeof json === "object") {
        const errors = json.errors as Record<string, unknown> | undefined;
        if (errors && typeof errors === "object" && typeof errors.general === "string") {
          return errors.general;
        }
        if (typeof json.message === "string") return json.message;
        if (typeof json.error === "string") return json.error;
      }
    }

    const text = await clone.text();
    return text || response.statusText || "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
}
