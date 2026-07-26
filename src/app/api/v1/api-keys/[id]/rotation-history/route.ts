import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";

export const dynamic = "force-dynamic";

/**
 * Real rotation history for a key — NOT a separate table. Derived from the
 * real `AuditLogEntry` rows `api-key.rotated` writes (see
 * src/app/api/v1/api-keys/[id]/rotate/route.ts): one side is found by
 * `target = "api-key:<id>"` (this id was the NEW key produced by a
 * rotation), the other by `metadata.oldKeyId = <id>` (this id was the OLD
 * key a rotation superseded) — a key can appear on either side of its own
 * history depending on whether it's ever been rotated itself or replaced
 * by a later rotation.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:read");
    const { id } = await params;

    const prisma = await getPrisma();
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.orgId !== principal.orgId) throw notFound("API key");

    const [asNewKey, asOldKey] = await Promise.all([
      prisma.auditLogEntry.findMany({
        where: { orgId: principal.orgId, action: "api-key.rotated", target: `api-key:${id}` },
      }),
      prisma.auditLogEntry.findMany({
        where: {
          orgId: principal.orgId,
          action: "api-key.rotated",
          metadata: { path: ["oldKeyId"], equals: id },
        },
      }),
    ]);

    const history = [...asNewKey, ...asOldKey]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((entry) => ({
        rotatedAt: entry.createdAt,
        rotatedBy: entry.actorId,
        newKeyId: entry.target.replace(/^api-key:/, ""),
        oldKeyId: (entry.metadata as { oldKeyId?: string }).oldKeyId ?? null,
        gracePeriodEndsAt:
          (entry.metadata as { gracePeriodEndsAt?: string }).gracePeriodEndsAt ?? null,
      }));

    return ok(history, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
