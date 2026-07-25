import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { generateApiKey } from "@/server/auth/api-keys";
import { sanitizeApiKey } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:write");
    const { id } = await params;

    const prisma = await getPrisma();
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.orgId !== principal.orgId) throw notFound("API key");

    const { plaintext, prefix, hash } = generateApiKey();
    const key = await prisma.apiKey.update({
      where: { id },
      data: { keyPrefix: prefix, keyHash: hash, status: "active" },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "api-key.rotated",
      target: `api-key:${key.id}`,
    });

    return ok(
      { apiKey: plaintext, ...sanitizeApiKey(key) },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
