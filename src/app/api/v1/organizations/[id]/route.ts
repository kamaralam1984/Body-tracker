import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { notFound, forbidden } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  plan: z.enum(["starter", "growth", "enterprise"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:read");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const prisma = await getPrisma();
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw notFound("Organization");

    return ok(org, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "organizations:write");
    if (id !== principal.orgId) throw forbidden("Cannot access another organization");

    const body = await parseJsonBody(request, patchSchema);

    const prisma = await getPrisma();
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) throw notFound("Organization");

    const org = await prisma.organization.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.plan !== undefined ? { plan: body.plan } : {}),
      },
    });

    writeAudit({
      orgId: org.id,
      actorId: principal.userId,
      action: "org.updated",
      target: org.id,
      metadata: { name: body.name, plan: body.plan },
    });

    return ok(org, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
