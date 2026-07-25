import { getPrisma } from "@/server/db/prisma";
import type { Prisma, TrackingEvent, TrackingEventType, TrackingSession } from "@prisma/client";

/**
 * Shared helpers for the live Tracking domain (`/api/v1/tracking/[sessionId]/*`).
 *
 * Centralizes event-appending and elapsed-duration math so every
 * start/pause/resume/stop/rep route handler behaves identically instead of
 * re-deriving these rules inline. Backed by the real Neon Postgres database
 * via Prisma.
 *
 * Enum mismatch: `prisma/schema.prisma`'s `TrackingEventType` enum spells the
 * form-alert value `form_alert` (Prisma enum identifiers can't contain
 * hyphens), but the app's tested API contract uses `"form-alert"` (hyphen) on
 * the wire. `toApiEventType` / `toPrismaEventType` convert at the boundary —
 * every TrackingEvent that crosses into/out of Prisma goes through these.
 * All other event type values are spelled identically on both sides.
 */

const CALORIES_PER_REP = 2;

export type ApiTrackingEventType =
  | "started"
  | "paused"
  | "resumed"
  | "rep"
  | "form-alert"
  | "completed"
  | "distraction"
  | "drowsiness_alert";

export type ApiTrackingEvent = Omit<TrackingEvent, "type"> & { type: ApiTrackingEventType };

export function toApiEventType(type: TrackingEventType): ApiTrackingEventType {
  return type === "form_alert" ? "form-alert" : type;
}

export function toPrismaEventType(type: ApiTrackingEventType): TrackingEventType {
  return type === "form-alert" ? "form_alert" : type;
}

function toApiEvent(event: TrackingEvent): ApiTrackingEvent {
  return { ...event, type: toApiEventType(event.type) };
}

/** Creates a TrackingEvent for a session and returns it in API (hyphenated) shape. */
export async function appendTrackingEvent(
  sessionId: string,
  type: ApiTrackingEventType,
  message: string,
  data: Record<string, number | string> = {},
): Promise<ApiTrackingEvent> {
  const prisma = await getPrisma();
  const event = await prisma.trackingEvent.create({
    data: {
      sessionId,
      type: toPrismaEventType(type),
      message,
      data: data as Prisma.InputJsonValue,
    },
  });
  return toApiEvent(event);
}

/**
 * Computes total elapsed duration (whole seconds) from `startedAt` to now.
 *
 * This is a lightweight approximation, not a full history of every
 * pause/resume gap — but if the session is *currently* paused when this is
 * called (e.g. stopping directly from a paused state), we subtract the time
 * spent in that open pause span so the final number is a bit more honest.
 */
export function computeElapsedSeconds(session: TrackingSession): number {
  if (!session.startedAt) return session.durationSeconds;

  const startedMs = session.startedAt.getTime();
  const nowMs = Date.now();
  let elapsedMs = nowMs - startedMs;

  if (session.status === "paused" && session.pausedAt) {
    const pausedMs = session.pausedAt.getTime();
    elapsedMs -= Math.max(0, nowMs - pausedMs);
  }

  return Math.max(0, Math.floor(elapsedMs / 1000));
}

/** Rolls a new form score into the session's running average form score. */
export function nextRunningAverage(
  currentAvg: number,
  priorSampleCount: number,
  nextValue: number,
): number {
  const total = currentAvg * priorSampleCount + nextValue;
  return total / (priorSampleCount + 1);
}

export { CALORIES_PER_REP };
