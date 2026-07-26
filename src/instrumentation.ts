/**
 * Runs once when a Next.js server instance starts (see
 * node_modules/next/dist/docs/.../instrumentation.md — `register()` is
 * this file's documented entry point, called before the server accepts
 * requests). Used here to start the webhook retry sweep
 * (`sweepFailedWebhookDeliveries`, see `src/server/services/webhooks-service.ts`)
 * as a real recurring interval in this long-lived PM2 process — there's no
 * background job queue (BullMQ+Redis) in this app yet, so an in-process
 * interval is the honest, working stand-in rather than a fabricated "queue."
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { sweepFailedWebhookDeliveries } = await import("@/server/services/webhooks-service");

  setInterval(() => {
    sweepFailedWebhookDeliveries().catch((error: unknown) =>
      console.error("[webhooks] retry sweep failed", error),
    );
  }, 60_000);
}
