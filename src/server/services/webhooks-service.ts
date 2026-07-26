import { createHmac, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type {
  Webhook as PrismaWebhook,
  WebhookDelivery as PrismaWebhookDelivery,
  WebhookEventType,
} from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";

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

async function performDelivery(
  webhook: PrismaWebhook,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<{ succeeded: boolean; responseStatus: number | null; durationMs: number }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(webhook.secret, body);
  const startedAt = Date.now();
  let responseStatus: number | null = null;
  let succeeded = false;
  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BTK-Signature": `sha256=${signature}`,
        "X-BTK-Event": event,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    responseStatus = response.status;
    succeeded = response.ok;
  } catch {
    // Network error, DNS failure, or timeout — a real, expected outcome to
    // record (and, below, retry), not a bug in this function.
    responseStatus = null;
    succeeded = false;
  }
  return { succeeded, responseStatus, durationMs: Date.now() - startedAt };
}

/**
 * Fires a REAL event at every org webhook subscribed to it — signs and POSTs
 * a genuine payload (not the `/test` endpoint's sample), and logs a real
 * `WebhookDelivery` row per webhook. Called from the actual moments these
 * events happen (session start/stop, report ready, member invited — see the
 * call sites in `src/app/api/v1/**`), not on a timer or a fabricated trigger.
 * Failures are picked up by `sweepFailedWebhookDeliveries`'s retry loop, so
 * this function never throws on a downstream delivery failure — only a
 * caller bug (bad `orgId`/Prisma outage) would surface as a thrown error.
 */
export async function dispatchWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const prisma = await getPrisma();
  const prismaEvent = toPrismaEventType(event);
  const webhooks = await prisma.webhook.findMany({
    where: { orgId, status: "active", events: { has: prismaEvent } },
  });
  if (webhooks.length === 0) return;

  const fullPayload = { event, ...payload, occurredAt: new Date().toISOString() };

  await Promise.all(
    webhooks.map(async (webhook) => {
      const result = await performDelivery(webhook, event, fullPayload);
      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event: prismaEvent,
          payload: fullPayload as Prisma.InputJsonValue,
          attempt: 1,
          status: result.succeeded ? "success" : "failed",
          responseStatus: result.responseStatus,
          durationMs: result.durationMs,
        },
      });
    }),
  );
}

/** 1m, 5m, 30m — after this many total attempts (including the first), a delivery stops retrying. */
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000];
const MAX_DELIVERY_ATTEMPTS = RETRY_BACKOFF_MS.length + 1;

/**
 * Retries failed webhook deliveries with backoff. There's no real job queue
 * (BullMQ+Redis) available yet — see INCOMPLETE.md — so this is a best-effort,
 * at-least-once in-process sweep (called on an interval from
 * `src/instrumentation.ts`), not a durable queue. It updates the failed
 * delivery row IN PLACE on each retry (reusing `createdAt` as "time of most
 * recent attempt" — there's no separate `lastAttemptAt` column) rather than
 * inserting a new row per attempt, which keeps this schema-change-free but
 * means the delivery log shows only the latest attempt's outcome, not full
 * per-attempt history. Under PM2's multi-worker cluster mode, two workers
 * could in principle race on the same row and both retry it — a known,
 * accepted, small risk of a duplicate delivery, not a correctness bug that
 * blocks shipping this without a real distributed lock.
 */
export async function sweepFailedWebhookDeliveries(): Promise<void> {
  const prisma = await getPrisma();
  const now = Date.now();

  const candidates = await prisma.webhookDelivery.findMany({
    where: { status: "failed", attempt: { lt: MAX_DELIVERY_ATTEMPTS } },
    include: { webhook: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  for (const delivery of candidates) {
    if (delivery.webhook.status !== "active") continue;

    const backoffMs = RETRY_BACKOFF_MS[delivery.attempt - 1] ?? RETRY_BACKOFF_MS.at(-1)!;
    const dueAt = delivery.createdAt.getTime() + backoffMs;
    if (now < dueAt) continue;

    const result = await performDelivery(
      delivery.webhook,
      toApiEventType(delivery.event),
      delivery.payload as Record<string, unknown>,
    );

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempt: delivery.attempt + 1,
        status: result.succeeded ? "success" : "failed",
        responseStatus: result.responseStatus,
        durationMs: result.durationMs,
        createdAt: new Date(),
      },
    });
  }
}
