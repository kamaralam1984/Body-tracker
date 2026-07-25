import { createHmac, randomUUID } from "node:crypto";
import type {
  Webhook as PrismaWebhook,
  WebhookDelivery as PrismaWebhookDelivery,
  WebhookEventType,
} from "@prisma/client";

/**
 * Business logic shared by the webhooks routes, backed by the real Neon
 * Postgres database via Prisma: the enum-mapping helpers that translate
 * between the app's tested, documented API contract (dot/hyphen-separated
 * event strings like "session.started", "tracking.form-alert") and
 * prisma/schema.prisma's WebhookEventType enum (underscore-separated —
 * Prisma enum identifiers can't contain dots), plus the sanitize helper
 * that strips a webhook's `secret` before it reaches a response body, and
 * the sample-payload/HMAC-signing helpers used by the `/test` delivery
 * endpoint.
 */

export type WebhookEvent =
  "session.started" | "session.completed" | "tracking.form-alert" | "report.ready" | "user.invited";

const API_TO_PRISMA_EVENT: Record<WebhookEvent, WebhookEventType> = {
  "session.started": "session_started",
  "session.completed": "session_completed",
  "tracking.form-alert": "tracking_form_alert",
  "report.ready": "report_ready",
  "user.invited": "user_invited",
};

const PRISMA_TO_API_EVENT: Record<WebhookEventType, WebhookEvent> = {
  session_started: "session.started",
  session_completed: "session.completed",
  tracking_form_alert: "tracking.form-alert",
  report_ready: "report.ready",
  user_invited: "user.invited",
};

/** Maps a single app-facing event string to its Prisma WebhookEventType enum value. */
export function toPrismaEventType(event: WebhookEvent): WebhookEventType {
  return API_TO_PRISMA_EVENT[event];
}

/** Maps a single Prisma WebhookEventType enum value back to the app-facing event string. */
export function toApiEventType(event: WebhookEventType): WebhookEvent {
  return PRISMA_TO_API_EVENT[event];
}

/** Maps an array of app-facing event strings to Prisma WebhookEventType enum values. */
export function toPrismaEvents(events: WebhookEvent[]): WebhookEventType[] {
  return events.map(toPrismaEventType);
}

/** Maps an array of Prisma WebhookEventType enum values back to app-facing event strings. */
export function toApiEvents(events: WebhookEventType[]): WebhookEvent[] {
  return events.map(toApiEventType);
}

export type SanitizedWebhook = Omit<PrismaWebhook, "secret" | "events"> & {
  events: WebhookEvent[];
};

/** Strips the `secret` field and maps Prisma's enum events back to app-facing strings before a webhook is returned from a GET/list/PATCH/DELETE response. */
export function sanitizeWebhook(webhook: PrismaWebhook): SanitizedWebhook {
  return {
    id: webhook.id,
    orgId: webhook.orgId,
    url: webhook.url,
    events: toApiEvents(webhook.events),
    status: webhook.status,
    createdAt: webhook.createdAt,
  };
}

export type ApiWebhookDelivery = Omit<PrismaWebhookDelivery, "event" | "payload"> & {
  event: WebhookEvent;
  payload: Record<string, unknown>;
};

/** Maps a Prisma WebhookDelivery row to the app-facing shape (event enum mapped back, payload re-typed from Json). */
export function toApiDelivery(delivery: PrismaWebhookDelivery): ApiWebhookDelivery {
  return {
    ...delivery,
    event: toApiEventType(delivery.event),
    payload: delivery.payload as Record<string, unknown>,
  };
}

/** Generates a plausible-looking sample id for use inside a sample event payload (not a persisted record's id). */
function sampleId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/** Builds a realistic sample payload for a given webhook event type. */
export function buildSampleEventPayload(
  event: WebhookEvent,
  orgId: string,
): Record<string, unknown> {
  const occurredAt = new Date().toISOString();

  switch (event) {
    case "session.started":
      return {
        event,
        sessionId: sampleId("sess"),
        orgId,
        activityKind: "squat",
        occurredAt,
      };
    case "session.completed":
      return {
        event,
        sessionId: sampleId("sess"),
        orgId,
        durationSeconds: 720,
        repCount: 24,
        avgFormScore: 84,
        occurredAt,
      };
    case "tracking.form-alert":
      return {
        event,
        sessionId: sampleId("sess"),
        orgId,
        message: "Knee alignment drifted outside safe range",
        severity: "warning",
        occurredAt,
      };
    case "report.ready":
      return {
        event,
        reportId: sampleId("rpt"),
        orgId,
        format: "pdf",
        sizeBytes: 184_320,
        occurredAt,
      };
    case "user.invited":
      return {
        event,
        userId: sampleId("user"),
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
