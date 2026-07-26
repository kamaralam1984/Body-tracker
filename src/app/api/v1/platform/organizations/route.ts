import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import {
  resolvePrincipal,
  requirePlatformAdmin,
  rateLimitResponseHeaders,
} from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { parseSort, searchWhere } from "@/server/http/sort";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["name", "plan", "createdAt"] as const;
const SEARCHABLE_FIELDS = ["name", "slug"] as const;

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
});

/**
 * Real cross-org organization list — the only real primitive that makes a
 * genuine platform-admin API-keys view possible (you need a real org list
 * to filter/label by). Gated by `requirePlatformAdmin`, not `requireScope`
 * — see the doc comment on `Principal.isPlatformAdmin`.
 */
export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requirePlatformAdmin(principal);

    const { cursor, limit, sort, search } = parseQuery(
      request.nextUrl.searchParams,
      listQuerySchema,
    );
    const prisma = await getPrisma();
    const orderBy = parseSort(sort, SORTABLE_FIELDS);

    const orgs = await prisma.organization.findMany({
      where: searchWhere(search, SEARCHABLE_FIELDS),
      orderBy: orderBy.length > 0 ? orderBy : { createdAt: "asc" },
      include: { _count: { select: { users: true, apiKeys: true } } },
    });

    const items = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      createdAt: org.createdAt,
      userCount: org._count.users,
      apiKeyCount: org._count.apiKeys,
    }));

    const { items: page, nextCursor, total } = paginate(items, cursor, limit);
    return ok({ items: page, nextCursor, total }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
