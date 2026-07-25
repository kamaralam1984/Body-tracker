import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { sanitizeUser } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:read");
    const { cursor, limit } = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const prisma = await getPrisma();
    const orgUsers = (
      await prisma.user.findMany({
        where: { orgId: principal.orgId },
        orderBy: { createdAt: "asc" },
      })
    ).map(sanitizeUser);
    const { items, nextCursor, total } = paginate(orgUsers, cursor, limit);
    return ok({ items, nextCursor, total }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
