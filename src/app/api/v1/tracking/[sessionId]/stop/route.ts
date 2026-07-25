import { NextRequest } from "next/server";
import { nowIso } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { getOrgSession, touchSession } from "@/server/services/sessions-service";
import { appendTrackingEvent, computeElapsedSeconds } from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "tracking:write");

    const session = getOrgSession(principal.orgId, sessionId);
    if (session.status !== "active" && session.status !== "paused") {
      throw conflict(
        `Cannot stop a session with status "${session.status}" — session must be active or paused`,
      );
    }

    session.durationSeconds = computeElapsedSeconds(session);
    session.status = "completed";
    session.endedAt = nowIso();
    session.pausedAt = null;
    touchSession(session);

    appendTrackingEvent(session.id, "completed", "Session completed", {
      durationSeconds: session.durationSeconds,
      repCount: session.repCount,
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
