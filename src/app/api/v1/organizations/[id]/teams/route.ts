import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { parseSort, searchWhere } from "@/server/http/sort";
import { forbidden } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["name", "createdAt"] as const;
const SEARCHABLE_FIELDS = ["name"] as const;

export const listQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
});

export const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:read");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const prisma = await getPrisma();
    const orderBy = parseSort(query.sort, SORTABLE_FIELDS);
    const teams = await prisma.team.findMany({
      where: { orgId: id, ...searchWhere(query.search, SEARCHABLE_FIELDS) },
      orderBy: orderBy.length > 0 ? orderBy : { createdAt: "asc" },
    });

    const page = paginate(teams, query.cursor, query.limit);

    return ok(page.items, {
      meta: { nextCursor: page.nextCursor, total: page.total },
      headers: rateLimitResponseHeaders(principal),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:write");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const body = await parseJsonBody(request, createSchema);

    const prisma = await getPrisma();
    const team = await prisma.team.create({
      data: { orgId: id, name: body.name },
    });

    writeAudit({
      orgId: id,
      actorId: principal.userId,
      action: "org.team_created",
      target: team.id,
      metadata: { name: team.name },
    });

    return ok(team, { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
