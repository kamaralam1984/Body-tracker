import Redis from "ioredis";
import { logger } from "../logging/logger";

/**
 * Optional shared Redis client — `null` (not connected) unless `REDIS_URL`
 * is set. Nothing in this app requires Redis to run; it's an opt-in upgrade
 * for state that needs to be shared across PM2's cluster-mode workers
 * (`ecosystem.config.js` runs `instances: "max"`, so a plain in-memory
 * `Map`/counter is per-worker, not per-deployment). See `docker-compose.yml`
 * for the intended `redis` service.
 */

let client: Redis | null | undefined;

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return client;
  }

  client = new Redis(url, { maxRetriesPerRequest: 1 });
  client.on("error", (error) => {
    logger.error(
      { err: error },
      "Redis connection error — features using it fall back to per-worker state",
    );
  });
  return client;
}
