import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { conflict } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { getOrgSession } from "@/server/services/sessions-service";
import { appendTrackingEvent } from "@/server/services/tracking-service";
import { dispatchWebhookEvent } from "@/server/services/webhooks-service";

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
    if (existing.status !== "idle") {
      throw conflict(
        `Cannot start a session with status "${existing.status}" — session must be idle`,
      );
    }

    const prisma = await getPrisma();
    const session = await prisma.trackingSession.update({
      where: { id: sessionId },
      data: { status: "active", startedAt: new Date(), pausedAt: null },
    });

    await appendTrackingEvent(session.id, "started", "Session started", {});

    dispatchWebhookEvent(principal.orgId, "session.started", {
      sessionId: session.id,
      activityKind: session.activityKind,
    }).catch((error) => console.error("[webhooks] dispatch failed for session.started", error));

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "tracking.started",
      target: session.id,
      metadata: {},
    });

    return ok(session, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
