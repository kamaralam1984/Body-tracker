import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { parseSort, searchWhere } from "@/server/http/sort";
import { writeAudit } from "@/server/http/audit";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["name", "status", "createdAt"] as const;
const SEARCHABLE_FIELDS = ["name"] as const;

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
});

export const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "service-accounts:read");

    const { cursor, limit, sort, search } = parseQuery(
      request.nextUrl.searchParams,
      listQuerySchema,
    );
    const prisma = await getPrisma();
    const orderBy = parseSort(sort, SORTABLE_FIELDS);
    const accounts = await prisma.serviceAccount.findMany({
      where: { orgId: principal.orgId, ...searchWhere(search, SEARCHABLE_FIELDS) },
      orderBy: orderBy.length > 0 ? orderBy : { createdAt: "desc" },
    });

    const page = paginate(accounts, cursor, limit);
    return ok(
      { items: page.items, nextCursor: page.nextCursor, total: page.total },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "service-accounts:write");

    const body = await parseJsonBody(request, createSchema);
    const prisma = await getPrisma();
    const account = await prisma.serviceAccount.create({
      data: { orgId: principal.orgId, name: body.name, status: "active" },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "service-account.created",
      target: account.id,
      metadata: { name: account.name },
    });

    return ok(account, { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
