import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/server/db/store";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { notFound, forbidden, conflict } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { sanitizeUser } from "@/server/services/organizations-service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  role: z.enum(["owner", "admin", "manager", "member", "viewer"]).optional(),
  teamId: z.string().nullable().optional(),
  status: z.enum(["active", "invited", "suspended"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:write");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const body = await parseJsonBody(request, patchSchema);

    const store = getStore();
    const user = store.users.get(userId);
    if (!user || user.orgId !== id) throw notFound("Member");

    if (body.role !== undefined) user.role = body.role;
    if (body.teamId !== undefined) user.teamId = body.teamId;
    if (body.status !== undefined) user.status = body.status;

    writeAudit({
      orgId: id,
      actorId: principal.userId,
      action: "org.member_updated",
      target: user.id,
      metadata: { role: body.role, teamId: body.teamId, status: body.status },
    });

    return ok(sanitizeUser(user), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:write");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const store = getStore();
    const user = store.users.get(userId);
    if (!user || user.orgId !== id) throw notFound("Member");

    if (user.role === "owner") throw conflict("Cannot remove the organization owner");

    store.users.delete(userId);

    writeAudit({
      orgId: id,
      actorId: principal.userId,
      action: "org.member_removed",
      target: userId,
      metadata: { email: user.email },
    });

    return ok({ id: userId, deleted: true }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
