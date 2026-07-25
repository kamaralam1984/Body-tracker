import { NextRequest } from "next/server";
import { getStore } from "@/server/db/store";
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

    const store = getStore();
    const key = store.apiKeys.get(id);
    if (!key || key.orgId !== principal.orgId) throw notFound("API key");

    const { plaintext, prefix, hash } = generateApiKey();
    key.keyPrefix = prefix;
    key.keyHash = hash;
    key.status = "active";

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
