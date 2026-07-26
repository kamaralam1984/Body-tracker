import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "oauth-clients:write");

    const prisma = await getPrisma();
    const client = await prisma.oAuthClient.findUnique({ where: { id } });
    if (!client || client.orgId !== principal.orgId) throw notFound("OAuth client");

    // Prisma's onDelete: Cascade on OAuthAuthorizationCode.client handles
    // cleaning up any of this client's still-pending authorization codes.
    await prisma.oAuthClient.delete({ where: { id: client.id } });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "oauth-client.deleted",
      target: client.id,
      metadata: { name: client.name },
    });

    return ok({ id: client.id, deleted: true }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
