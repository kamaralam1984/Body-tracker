import { NextRequest } from "next/server";
import { nowIso } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { getOrgSession, touchSession } from "@/server/services/sessions-service";
import { appendTrackingEvent } from "@/server/services/tracking-service";

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
    if (session.status !== "active") {
      throw conflict(
        `Cannot pause a session with status "${session.status}" — session must be active`,
      );
    }

    session.status = "paused";
    session.pausedAt = nowIso();
    touchSession(session);

    appendTrackingEvent(session.id, "paused", "Session paused", {});

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "tracking.paused",
      target: session.id,
      metadata: {},
    });

    return ok(session, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
