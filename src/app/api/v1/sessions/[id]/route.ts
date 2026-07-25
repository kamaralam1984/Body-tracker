import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { writeAudit } from "@/server/http/audit";
import { getOrgSession } from "@/server/services/sessions-service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "sessions:read");

    const session = await getOrgSession(principal.orgId, id);

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
    await getOrgSession(principal.orgId, id);

    const prisma = await getPrisma();
    const session = await prisma.trackingSession.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
      },
    });

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

    const session = await getOrgSession(principal.orgId, id);
    const prisma = await getPrisma();
    // Prisma's onDelete: Cascade on TrackingEvent.session handles deleting
    // this session's events automatically.
    await prisma.trackingSession.delete({ where: { id: session.id } });

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
