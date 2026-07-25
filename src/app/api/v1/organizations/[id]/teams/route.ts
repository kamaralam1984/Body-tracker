import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore, newId, nowIso } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { forbidden } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import type { Team } from "@/server/db/entities";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:read");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const store = getStore();
    const teams = [...store.teams.values()]
      .filter((team) => team.orgId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

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

    const store = getStore();
    const team: Team = {
      id: newId("team"),
      orgId: id,
      name: body.name,
      createdAt: nowIso(),
    };
    store.teams.set(team.id, team);

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
