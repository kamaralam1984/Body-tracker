import type { TrackingSession, TrackingStatus } from "@/server/db/entities";
import { getStore } from "@/server/db/store";
import { notFound } from "@/server/http/errors";

/**
 * Shared helpers for the Sessions domain (`/api/v1/sessions`).
 *
 * Keeps list-filtering/sorting and org-scoped lookups in one place so the
 * route handlers stay thin and the "404 if missing or wrong org" rule can't
 * accidentally drift between GET/PATCH/DELETE.
 */

export interface SessionFilters {
  status?: TrackingStatus;
  activityKind?: string;
}

/** Returns an org's tracking sessions, optionally filtered, sorted newest-first by createdAt. */
export function listOrgSessions(orgId: string, filters: SessionFilters = {}): TrackingSession[] {
  const store = getStore();
  return [...store.trackingSessions.values()]
    .filter((session) => session.orgId === orgId)
    .filter((session) => (filters.status ? session.status === filters.status : true))
    .filter((session) =>
      filters.activityKind ? session.activityKind === filters.activityKind : true,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Looks up a session by id, enforcing org scoping. Throws `notFound("Session")` otherwise. */
export function getOrgSession(orgId: string, id: string): TrackingSession {
  const store = getStore();
  const session = store.trackingSessions.get(id);
  if (!session || session.orgId !== orgId) throw notFound("Session");
  return session;
}

/** Bumps `updatedAt` to now — call after any in-place mutation of a session record. */
export function touchSession(session: TrackingSession): void {
  session.updatedAt = new Date().toISOString();
}
