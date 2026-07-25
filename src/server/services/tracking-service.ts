import type { TrackingEvent, TrackingSession } from "@/server/db/entities";
import { getStore, newId, nowIso } from "@/server/db/store";

/**
 * Shared helpers for the live Tracking domain (`/api/v1/tracking/[sessionId]/*`).
 *
 * Centralizes event-appending and elapsed-duration math so every
 * start/pause/resume/stop/rep route handler behaves identically instead of
 * re-deriving these rules inline.
 */

const CALORIES_PER_REP = 2;

/** Appends a TrackingEvent for a session and returns it. Initializes the events array if absent. */
export function appendTrackingEvent(
  sessionId: string,
  type: TrackingEvent["type"],
  message: string,
  data: Record<string, number | string> = {},
): TrackingEvent {
  const store = getStore();
  const event: TrackingEvent = {
    id: newId("evt"),
    sessionId,
    type,
    message,
    data,
    createdAt: nowIso(),
  };
  const events = store.trackingEvents.get(sessionId) ?? [];
  events.push(event);
  store.trackingEvents.set(sessionId, events);
  return event;
}

/**
 * Computes total elapsed duration (whole seconds) from `startedAt` to now.
 *
 * This is an in-memory demo, so we don't keep a full history of every
 * pause/resume gap — but if the session is *currently* paused when this is
 * called (e.g. stopping directly from a paused state), we subtract the time
 * spent in that open pause span so the final number is a bit more honest.
 */
export function computeElapsedSeconds(session: TrackingSession): number {
  if (!session.startedAt) return session.durationSeconds;

  const startedMs = new Date(session.startedAt).getTime();
  const nowMs = Date.now();
  let elapsedMs = nowMs - startedMs;

  if (session.status === "paused" && session.pausedAt) {
    const pausedMs = new Date(session.pausedAt).getTime();
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
