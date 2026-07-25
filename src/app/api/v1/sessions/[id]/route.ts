import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { writeAudit } from "@/server/http/audit";
import { getOrgSession, touchSession } from "@/server/services/sessions-service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "sessions:read");

    const session = getOrgSession(principal.orgId, id);

    return ok(session, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "sessions:write");

    const body = await parseJsonBody(request, patchSchema);
    const session = getOrgSession(principal.orgId, id);

    if (body.title !== undefined) session.title = body.title;
    touchSession(session);

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "session.updated",
      target: session.id,
      metadata: { title: body.title },
    });

    return ok(session, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "sessions:write");

    const session = getOrgSession(principal.orgId, id);
    const store = getStore();
    store.trackingSessions.delete(session.id);
    store.trackingEvents.delete(session.id);

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "session.deleted",
      target: session.id,
      metadata: { title: session.title },
    });

    return ok({ id: session.id, deleted: true }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
