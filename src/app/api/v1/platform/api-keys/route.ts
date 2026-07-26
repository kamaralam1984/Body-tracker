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
import { sanitizeApiKey } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["name", "status", "createdAt", "lastUsedAt"] as const;
const SEARCHABLE_FIELDS = ["name"] as const;

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
  // Real cross-org data, but still supports narrowing to one org — the
  // admin UI's org filter dropdown uses this rather than fetching
  // everything and filtering client-side.
  orgId: z.string().optional(),
});

/**
 * Real cross-org API key list — every row is a genuine `ApiKey` from any
 * organization, each with its real owning org's name/slug attached. This
 * is the actual backend for `admin/api-keys`, which previously rendered
 * 8 entirely fictional organizations and 18 fabricated keys. Gated by
 * `requirePlatformAdmin`, not `requireScope` (see `Principal.isPlatformAdmin`).
 */
export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requirePlatformAdmin(principal);

    const { cursor, limit, sort, search, orgId } = parseQuery(
      request.nextUrl.searchParams,
      listQuerySchema,
    );
    const prisma = await getPrisma();
    const orderBy = parseSort(sort, SORTABLE_FIELDS);

    const keys = await prisma.apiKey.findMany({
      where: { ...(orgId ? { orgId } : {}), ...searchWhere(search, SEARCHABLE_FIELDS) },
      orderBy: orderBy.length > 0 ? orderBy : { createdAt: "desc" },
      include: { organization: { select: { name: true, slug: true } } },
    });

    const items = keys.map((key) => ({
      ...sanitizeApiKey(key),
      organizationName: key.organization.name,
      organizationSlug: key.organization.slug,
    }));

    const { items: page, nextCursor, total } = paginate(items, cursor, limit);
    return ok({ items: page, nextCursor, total }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
