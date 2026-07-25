import { createHmac } from "node:crypto";
import type { Webhook, WebhookEvent } from "@/server/db/entities";
import { newId, nowIso } from "@/server/db/store";

export type SafeWebhook = Omit<Webhook, "secret">;

/** Strips the `secret` field before a webhook is returned from a GET/list/PATCH/DELETE response. */
export function sanitizeWebhook(webhook: Webhook): SafeWebhook {
  return {
    id: webhook.id,
    orgId: webhook.orgId,
    url: webhook.url,
    events: webhook.events,
    status: webhook.status,
    createdAt: webhook.createdAt,
  };
}

/**
 * Shared helpers for the Webhooks domain: building realistic sample event
 * payloads (used by the `/test` delivery endpoint) and HMAC-signing outbound
 * delivery bodies so recipients can verify authenticity.
 */

/** Builds a realistic sample payload for a given webhook event type. */
export function buildSampleEventPayload(
  event: WebhookEvent,
  orgId: string,
): Record<string, unknown> {
  const occurredAt = nowIso();

  switch (event) {
    case "session.started":
      return {
        event,
        sessionId: newId("sess"),
        orgId,
        activityKind: "squat",
        occurredAt,
      };
    case "session.completed":
      return {
        event,
        sessionId: newId("sess"),
        orgId,
        durationSeconds: 720,
        repCount: 24,
        avgFormScore: 84,
        occurredAt,
      };
    case "tracking.form-alert":
      return {
        event,
        sessionId: newId("sess"),
        orgId,
        message: "Knee alignment drifted outside safe range",
        severity: "warning",
        occurredAt,
      };
    case "report.ready":
      return {
        event,
        reportId: newId("rpt"),
        orgId,
        format: "pdf",
        sizeBytes: 184_320,
        occurredAt,
      };
    case "user.invited":
      return {
        event,
        userId: newId("user"),
        orgId,
        email: "new.teammate@example.com",
        role: "member",
        occurredAt,
      };
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

/** Signs a raw request body with the webhook's shared secret (HMAC-SHA256, hex-encoded). */
export function signPayload(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}
