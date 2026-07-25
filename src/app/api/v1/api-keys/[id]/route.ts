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
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:write");
    const { id } = await params;

    const prisma = await getPrisma();
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.orgId !== principal.orgId) throw notFound("API key");

    await prisma.apiKey.update({ where: { id }, data: { status: "revoked" } });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "api-key.revoked",
      target: `api-key:${key.id}`,
    });

    return ok({ success: true }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
