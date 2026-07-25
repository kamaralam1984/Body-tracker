import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { writeAudit } from "@/server/http/audit";
import { listOrgSessions } from "@/server/services/sessions-service";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  status: z.enum(["idle", "active", "paused", "completed"]).optional(),
  activityKind: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createSchema = z.object({
  title: z.string().min(1),
  activityKind: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "sessions:read");

    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const sessions = await listOrgSessions(principal.orgId, {
      status: query.status,
      activityKind: query.activityKind,
    });
    const page = paginate(sessions, query.cursor, query.limit ?? 20);

    return ok(page, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "sessions:write");

    const body = await parseJsonBody(request, createSchema);
    const prisma = await getPrisma();

    const session = await prisma.trackingSession.create({
      data: {
        orgId: principal.orgId,
        userId: principal.userId,
        title: body.title,
        activityKind: body.activityKind,
        status: "idle",
      },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "session.created",
      target: session.id,
      metadata: { title: session.title, activityKind: session.activityKind },
    });

    return ok(session, { status: 201, headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
