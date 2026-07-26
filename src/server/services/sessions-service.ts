import { getPrisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { parseSort, searchWhere } from "@/server/http/sort";
import type { TrackingSession, TrackingStatus } from "@prisma/client";

const SORTABLE_FIELDS = [
  "title",
  "activityKind",
  "status",
  "startedAt",
  "createdAt",
  "updatedAt",
] as const;
const SEARCHABLE_FIELDS = ["title", "activityKind"] as const;

/**
 * Shared helpers for the Sessions domain (`/api/v1/sessions`).
 *
 * Keeps list-filtering/sorting and org-scoped lookups in one place so the
 * route handlers stay thin and the "404 if missing or wrong org" rule can't
 * accidentally drift between GET/PATCH/DELETE.
 *
 * Backed by the real Neon Postgres database via Prisma. Note there's no
 * `touchSession` helper anymore — the schema's `updatedAt DateTime @updatedAt`
 * means every `prisma.trackingSession.update()` call bumps it automatically.
 */

export type { TrackingSession, TrackingStatus };

export interface SessionFilters {
  status?: TrackingStatus;
  activityKind?: string;
  sort?: string;
  search?: string;
}

/** Returns an org's tracking sessions, optionally filtered/searched, sorted by `sort` (default: newest-first by createdAt). */
export async function listOrgSessions(
  orgId: string,
  filters: SessionFilters = {},
): Promise<TrackingSession[]> {
  const prisma = await getPrisma();
  const orderBy = parseSort(filters.sort, SORTABLE_FIELDS);
  return prisma.trackingSession.findMany({
    where: {
      orgId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.activityKind ? { activityKind: filters.activityKind } : {}),
      ...searchWhere(filters.search, SEARCHABLE_FIELDS),
    },
    orderBy: orderBy.length > 0 ? orderBy : { createdAt: "desc" },
  });
}

/** Looks up a session by id, enforcing org scoping. Throws `notFound("Session")` otherwise. */
export async function getOrgSession(orgId: string, id: string): Promise<TrackingSession> {
  const prisma = await getPrisma();
  const session = await prisma.trackingSession.findUnique({ where: { id } });
  if (!session || session.orgId !== orgId) throw notFound("Session");
  return session;
}
