import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";

export const dynamic = "force-dynamic";

export const querySchema = z.object({
  userId: z.string().optional(),
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "analytics:read");

    const query = parseQuery(request.nextUrl.searchParams, querySchema);

    const prisma = await getPrisma();
    const rows = await prisma.analyticsSnapshot.findMany({
      where: { orgId: principal.orgId, ...(query.userId ? { userId: query.userId } : {}) },
      orderBy: { date: "desc" },
    });

    const page = paginate(rows, query.cursor, query.limit);

    return ok(page.items, {
      meta: { nextCursor: page.nextCursor, total: page.total },
      headers: rateLimitResponseHeaders(principal),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
