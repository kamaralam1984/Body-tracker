import { NextRequest } from "next/server";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { forbidden } from "@/server/http/errors";
import { ROLE_DESCRIPTORS } from "@/server/services/organizations-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:read");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    return ok(ROLE_DESCRIPTORS, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
