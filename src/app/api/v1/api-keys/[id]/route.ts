import { NextRequest } from "next/server";
import { getStore } from "@/server/db/store";
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

    const store = getStore();
    const key = store.apiKeys.get(id);
    if (!key || key.orgId !== principal.orgId) throw notFound("API key");

    key.status = "revoked";

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
