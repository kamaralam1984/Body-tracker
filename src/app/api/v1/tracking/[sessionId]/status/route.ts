import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { getOrgSession } from "@/server/services/sessions-service";
import { toApiEventType } from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

const RECENT_EVENTS_LIMIT = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "tracking:read");

    const session = await getOrgSession(principal.orgId, sessionId);
    const prisma = await getPrisma();
    const events = await prisma.trackingEvent.findMany({
      where: { sessionId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: RECENT_EVENTS_LIMIT,
    });
    const recentEvents = events.map((event) => ({ ...event, type: toApiEventType(event.type) }));

    return ok({ session, recentEvents }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
