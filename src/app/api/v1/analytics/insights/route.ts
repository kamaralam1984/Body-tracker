import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { buildInsights } from "@/server/services/analytics-service";

export const dynamic = "force-dynamic";

export const querySchema = z.object({
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "analytics:read");

    const query = parseQuery(request.nextUrl.searchParams, querySchema);

    const prisma = await getPrisma();
    const scoped = await prisma.analyticsSnapshot.findMany({
      where: { orgId: principal.orgId, ...(query.userId ? { userId: query.userId } : {}) },
    });

    const insights = buildInsights(scoped);

    return ok(insights, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
