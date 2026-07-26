import pino from "pino";

/**
 * Shared structured (JSON) logger for server-side code — real `pino`
 * output with levels/timestamps/fields, not string-concatenated
 * `console.error` calls. Pretty-printed in dev (`NODE_ENV !== "production"`)
 * for readability, raw JSON in production so a real log aggregator
 * (CloudWatch, Loki, whatever the VPS ends up shipping to) can parse it.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
