import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { filterByDateRange, summarize } from "@/server/services/analytics-service";

export const dynamic = "force-dynamic";

function daysAgoDateOnly(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const querySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "analytics:read");

    const query = parseQuery(request.nextUrl.searchParams, querySchema);
    const from = query.from ?? daysAgoDateOnly(7);
    const to = query.to ?? daysAgoDateOnly(0);

    const prisma = await getPrisma();
    const scoped = await prisma.analyticsSnapshot.findMany({
      where: { orgId: principal.orgId, ...(query.userId ? { userId: query.userId } : {}) },
    });
    const inRange = filterByDateRange(scoped, from, to);

    const summary = summarize(inRange, from, to);

    return ok(summary, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
