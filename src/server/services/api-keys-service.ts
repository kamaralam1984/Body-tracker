import { getPrisma } from "@/server/db/prisma";
import { writeAudit } from "@/server/http/audit";
import { notifyUser } from "@/server/services/notifications-service";
import { logger } from "@/server/logging/logger";

/**
 * Real, scheduled cleanup for time-based key lifecycle transitions —
 * called from the sweep in `src/instrumentation.ts` (same 60s-interval
 * pattern as the existing webhook retry sweep). Two real things happen:
 *
 * 1. A rotated-out key's grace period passing → flip `status` to
 *    "revoked" (resolvePrincipal already rejects it directly as a safety
 *    net before this runs, so no live gap — this just makes the DB state
 *    match reality instead of leaving a technically-still-"active" row
 *    that no longer actually authenticates).
 * 2. `expiresAt` passing on a still-"active" key → same flip. Before this
 *    existed, an expired key stayed `status: "active"` forever in the
 *    database even though `resolvePrincipal` already refused it — this
 *    closes that real "no auto-cleanup of expired keys" gap.
 */
export async function sweepExpiredApiKeys(): Promise<void> {
  const prisma = await getPrisma();
  const now = new Date();

  const [gracePeriodExpired, keysExpired] = await Promise.all([
    prisma.apiKey.findMany({
      where: { status: "active", gracePeriodEndsAt: { lt: now } },
      select: { id: true, orgId: true, userId: true, name: true },
    }),
    prisma.apiKey.findMany({
      where: { status: "active", expiresAt: { lt: now } },
      select: { id: true, orgId: true, userId: true, name: true },
    }),
  ]);

  for (const key of gracePeriodExpired) {
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { status: "revoked", revokedReason: "Rotation grace period ended" },
    });
    writeAudit({
      orgId: key.orgId,
      actorId: null,
      action: "api-key.revoked",
      target: `api-key:${key.id}`,
      metadata: { reason: "Rotation grace period ended", automatic: true },
    });
    if (key.userId) {
      notifyUser({
        orgId: key.orgId,
        userId: key.userId,
        type: "api_key.revoked",
        title: `Old key superseded by "${key.name}"'s rotation is now revoked`,
        body: `The previous "${key.name}" secret's grace period ended and it has been automatically revoked.`,
        metadata: { apiKeyId: key.id, reason: "Rotation grace period ended", automatic: true },
      }).catch((error) =>
        logger.error({ err: error }, "failed to notify api-key.revoked (grace period)"),
      );
    }
  }

  for (const key of keysExpired) {
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { status: "revoked", revokedReason: "Expired" },
    });
    writeAudit({
      orgId: key.orgId,
      actorId: null,
      action: "api-key.revoked",
      target: `api-key:${key.id}`,
      metadata: { reason: "Expired", automatic: true },
    });
    if (key.userId) {
      notifyUser({
        orgId: key.orgId,
        userId: key.userId,
        type: "api_key.revoked",
        title: `API key "${key.name}" expired and was revoked`,
        body: `Your API key "${key.name}" reached its expiration date and has been automatically revoked.`,
        metadata: { apiKeyId: key.id, reason: "Expired", automatic: true },
      }).catch((error) =>
        logger.error({ err: error }, "failed to notify api-key.revoked (expired)"),
      );
    }
  }
}
