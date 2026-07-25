import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { getOrgSession } from "@/server/services/sessions-service";
import { appendTrackingEvent, computeElapsedSeconds } from "@/server/services/tracking-service";
import { recordSessionCompletion } from "@/server/services/analytics-snapshot-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "tracking:write");

    const existing = await getOrgSession(principal.orgId, sessionId);
    if (existing.status !== "active" && existing.status !== "paused") {
      throw conflict(
        `Cannot stop a session with status "${existing.status}" — session must be active or paused`,
      );
    }

    const durationSeconds = computeElapsedSeconds(existing);

    const prisma = await getPrisma();
    const session = await prisma.trackingSession.update({
      where: { id: sessionId },
      data: {
        durationSeconds,
        status: "completed",
        endedAt: new Date(),
        pausedAt: null,
      },
    });

    await appendTrackingEvent(session.id, "completed", "Session completed", {
      durationSeconds: session.durationSeconds,
      repCount: session.repCount,
    });

    await recordSessionCompletion(principal.orgId, principal.userId, {
      endedAt: session.endedAt ?? new Date(),
      durationSeconds: session.durationSeconds,
      repCount: session.repCount,
      avgFormScore: session.avgFormScore,
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "tracking.stopped",
      target: session.id,
      metadata: { durationSeconds: session.durationSeconds, repCount: session.repCount },
    });

    return ok(session, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
