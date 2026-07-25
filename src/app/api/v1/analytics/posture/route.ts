import { NextRequest } from "next/server";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { getPostureSnapshot } from "@/server/services/intelligence-read-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "analytics:read");

    const snapshot = await getPostureSnapshot(principal.orgId, principal.userId);

    return ok(snapshot, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
