import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { writeAudit } from "@/server/http/audit";

export const dynamic = "force-dynamic";

export const patchSchema = z.object({
  status: z.enum(["active", "revoked"]).optional(),
  name: z.string().min(1).optional(),
});

async function getOrgServiceAccount(orgId: string, id: string) {
  const prisma = await getPrisma();
  const account = await prisma.serviceAccount.findUnique({ where: { id } });
  if (!account || account.orgId !== orgId) throw notFound("Service account");
  return account;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "service-accounts:write");

    const body = await parseJsonBody(request, patchSchema);
    await getOrgServiceAccount(principal.orgId, id);

    const prisma = await getPrisma();
    const account = await prisma.serviceAccount.update({
      where: { id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
      },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "service-account.updated",
      target: account.id,
      metadata: { status: account.status, name: account.name },
    });

    return ok(account, { headers: rateLimitResponseHeaders(principal) });
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
    requireScope(principal, "service-accounts:write");

    const account = await getOrgServiceAccount(principal.orgId, id);
    const prisma = await getPrisma();
    // Prisma's onDelete: Cascade on ApiKey.serviceAccount handles revoking
    // this service account's keys automatically.
    await prisma.serviceAccount.delete({ where: { id: account.id } });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "service-account.deleted",
      target: account.id,
      metadata: { name: account.name },
    });

    return ok({ id: account.id, deleted: true }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
