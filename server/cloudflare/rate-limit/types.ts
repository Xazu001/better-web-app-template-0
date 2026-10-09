/** Result of a rate limit check */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}
