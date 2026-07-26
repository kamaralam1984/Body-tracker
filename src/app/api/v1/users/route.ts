import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { parseSort, searchWhere } from "@/server/http/sort";
import { sanitizeUser } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["name", "email", "role", "status", "createdAt"] as const;
const SEARCHABLE_FIELDS = ["name", "email"] as const;

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:read");
    const { cursor, limit, sort, search } = parseQuery(
      request.nextUrl.searchParams,
      listQuerySchema,
    );
    const prisma = await getPrisma();
    const orderBy = parseSort(sort, SORTABLE_FIELDS);
    const orgUsers = (
      await prisma.user.findMany({
        where: { orgId: principal.orgId, ...searchWhere(search, SEARCHABLE_FIELDS) },
        orderBy: orderBy.length > 0 ? orderBy : { createdAt: "asc" },
      })
    ).map(sanitizeUser);
    const { items, nextCursor, total } = paginate(orgUsers, cursor, limit);
    return ok({ items, nextCursor, total }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
