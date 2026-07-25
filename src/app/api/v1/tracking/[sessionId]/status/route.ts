import { NextRequest } from "next/server";
import { getStore } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { getOrgSession } from "@/server/services/sessions-service";

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

    const session = getOrgSession(principal.orgId, sessionId);
    const store = getStore();
    const events = store.trackingEvents.get(sessionId) ?? [];
    const recentEvents = events.slice(-RECENT_EVENTS_LIMIT).reverse();

    return ok({ session, recentEvents }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
