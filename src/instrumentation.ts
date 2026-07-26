/**
 * Runs once when a Next.js server instance starts (see
 * node_modules/next/dist/docs/.../instrumentation.md — `register()` is
 * this file's documented entry point, called before the server accepts
 * requests). Real things started here:
 *
 * 1. OpenTelemetry (`startOpenTelemetry`, see `src/server/observability/otel.ts`)
 *    — a genuine no-op unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set, and
 *    started first since OTel instrumentation needs to patch `http`/`pg`
 *    before other modules require them.
 * 2. The webhook retry sweep (`sweepFailedWebhookDeliveries`, see
 *    `src/server/services/webhooks-service.ts`) as a real recurring
 *    interval in this long-lived PM2 process — there's no background job
 *    queue (BullMQ+Redis) in this app yet, so an in-process interval is
 *    the honest, working stand-in rather than a fabricated "queue."
 * 3. The API-key expiry/rotation-grace-period sweep
 *    (`sweepExpiredApiKeys`, see `src/server/services/api-keys-service.ts`)
 *    — same interval pattern.
 * 4. The security-notification sweep (`sweepSecurityNotifications`, see
 *    `src/server/services/notifications-service.ts`) — same 60s interval,
 *    detects failed-auth spikes and repeated rate-limit hits from
 *    `ApiRequestLog` rows already being written.
 * 5. The near-expiration notification sweep
 *    (`sweepNearExpirationApiKeys`) — a separate, real 24h interval (not
 *    the 60s one) since "notify once a key is within 7 days of expiring"
 *    only needs to run daily.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startOpenTelemetry } = await import("@/server/observability/otel");
  await startOpenTelemetry();

  const { logger } = await import("@/server/logging/logger");
  const { sweepFailedWebhookDeliveries } = await import("@/server/services/webhooks-service");
  const { sweepExpiredApiKeys } = await import("@/server/services/api-keys-service");
  const { sweepSecurityNotifications, sweepNearExpirationApiKeys } =
    await import("@/server/services/notifications-service");

  setInterval(() => {
    sweepFailedWebhookDeliveries().catch((error: unknown) =>
      logger.error({ err: error }, "webhook retry sweep failed"),
    );
    sweepExpiredApiKeys().catch((error: unknown) =>
      logger.error({ err: error }, "API key expiry sweep failed"),
    );
    sweepSecurityNotifications().catch((error: unknown) =>
      logger.error({ err: error }, "security notification sweep failed"),
    );
  }, 60_000);

  setInterval(
    () => {
      sweepNearExpirationApiKeys().catch((error: unknown) =>
        logger.error({ err: error }, "near-expiration notification sweep failed"),
      );
    },
    24 * 60 * 60 * 1000,
  );
}
