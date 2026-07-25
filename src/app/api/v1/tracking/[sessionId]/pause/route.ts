import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { getOrgSession } from "@/server/services/sessions-service";
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

    const existing = await getOrgSession(principal.orgId, sessionId);
    if (existing.status !== "active") {
      throw conflict(
        `Cannot pause a session with status "${existing.status}" — session must be active`,
      );
    }

    const prisma = await getPrisma();
    const session = await prisma.trackingSession.update({
      where: { id: sessionId },
      data: { status: "paused", pausedAt: new Date() },
    });

    await appendTrackingEvent(session.id, "paused", "Session paused", {});

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
