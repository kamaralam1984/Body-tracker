import { ApiError } from "./errors";
import { getRedisClient } from "../redis/client";
import { logger } from "../logging/logger";

/**
 * Rate limiter, keyed per caller (API key id, user id, or IP) and per
 * bucket name so different endpoint classes can carry different limits.
 * Backed by Redis (shared across PM2's cluster-mode workers) when
 * `REDIS_URL` is set; otherwise falls back to the in-memory fixed-window
 * `Map` below, which is correct for a single worker but under-counts
 * across a multi-worker cluster deployment — this is the concrete,
 * load-bearing reason to set `REDIS_URL` in production, not a theoretical
 * nice-to-have.
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

function checkRateLimitInMemory(
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

async function checkRateLimitRedis(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) throw new Error("checkRateLimitRedis called without a Redis client");

  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, opts.windowMs);
  }
  const ttlMs = await redis.pttl(redisKey);
  const resetAt = Date.now() + (ttlMs > 0 ? ttlMs : opts.windowMs);

  if (count > opts.limit) {
    throw new ApiError("rate_limited", "Rate limit exceeded — please slow down", {
      retryAfterMs: Math.max(0, resetAt - Date.now()),
    });
  }

  return { limit: opts.limit, remaining: Math.max(0, opts.limit - count), resetAt };
}

export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) return checkRateLimitInMemory(key, opts);

  try {
    return await checkRateLimitRedis(key, opts);
  } catch (error) {
    // A real, deliberate rate-limit rejection — propagate it.
    if (error instanceof ApiError) throw error;
    // A Redis connectivity problem — degrade to per-worker in-memory
    // limiting rather than failing every request outright.
    logger.error({ err: error }, "Redis unavailable, falling back to in-memory for this request");
    return checkRateLimitInMemory(key, opts);
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
}
