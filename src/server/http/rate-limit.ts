import { ApiError } from "./errors";

/**
 * In-memory sliding-window rate limiter — a stand-in for a Redis-backed
 * limiter in production (see docker-compose.yml for the intended Redis
 * service). Keyed per caller (API key id, user id, or IP) and per bucket
 * name so different endpoint classes can carry different limits.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: Window = { count: 1, resetAt: now + opts.windowMs };
    windows.set(key, fresh);
    return { limit: opts.limit, remaining: opts.limit - 1, resetAt: fresh.resetAt };
  }

  existing.count += 1;
  if (existing.count > opts.limit) {
    throw new ApiError("rate_limited", "Rate limit exceeded — please slow down", {
      retryAfterMs: existing.resetAt - now,
    });
  }

  return { limit: opts.limit, remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
}
