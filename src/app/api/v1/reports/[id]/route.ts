import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "reports:read");

    const prisma = await getPrisma();
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report || report.orgId !== principal.orgId) throw notFound("Report");

    return ok(report, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
