import type { Env } from "$/setup";
import type { Context, Next } from "hono";

export async function privMiddleware(
  c: Context<{ Bindings: Env & { PRIV_API_KEY: string } }>,
  next: Next
) {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    return c.json({ error: "Missing API key" }, 401);
  }

  const expectedKey = c.env.PRIV_API_KEY;

  if (!expectedKey) {
    console.error("PRIV_API_KEY not configured in environment");
    return c.json({ error: "Server configuration error" }, 500);
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(apiKey, expectedKey)) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  await next();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
