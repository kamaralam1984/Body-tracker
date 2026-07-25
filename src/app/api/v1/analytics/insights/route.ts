import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { buildInsights } from "@/server/services/analytics-service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "analytics:read");

    const query = parseQuery(request.nextUrl.searchParams, querySchema);

    const store = getStore();
    const scoped = [...store.analyticsSnapshots.values()].filter(
      (s) => s.orgId === principal.orgId && (query.userId ? s.userId === query.userId : true),
    );

    const insights = buildInsights(scoped);

    return ok(insights, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
