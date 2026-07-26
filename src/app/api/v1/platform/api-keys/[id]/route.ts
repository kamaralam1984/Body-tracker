import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import {
  resolvePrincipal,
  requirePlatformAdmin,
  rateLimitResponseHeaders,
} from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { ApiError, notFound } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { notifyUser } from "@/server/services/notifications-service";
import { logger } from "@/server/logging/logger";
import { revokeSchema } from "@/app/api/v1/api-keys/[id]/route";

export const dynamic = "force-dynamic";

/**
 * Real cross-org revoke — the one genuinely security-critical action a
 * platform admin needs ("kill this leaking key regardless of which
 * tenant it belongs to"). Deliberately the only mutation exposed here:
 * rotate is left to the owning tenant (a platform admin issuing a new
 * secret on someone else's behalf is an unusual, not-asked-for operation
 * — see INCOMPLETE.md).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const principal = await resolvePrincipal(request);
    requirePlatformAdmin(principal);
    const { id } = await params;

    const rawBody = await request.text();
    let reason: string | undefined;
    if (rawBody.length > 0) {
      const parsed = revokeSchema.safeParse(JSON.parse(rawBody));
      if (!parsed.success) {
        throw new ApiError("validation_error", "Invalid request body", parsed.error.flatten());
      }
      reason = parsed.data.reason;
    }

    const prisma = await getPrisma();
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw notFound("API key");

    await prisma.apiKey.update({
      where: { id },
      data: { status: "revoked", revokedReason: reason ?? "Manual" },
    });

    writeAudit({
      orgId: key.orgId,
      actorId: principal.userId,
      action: "api-key.revoked",
      target: `api-key:${key.id}`,
      metadata: { reason: reason ?? "Manual", viaPlatformAdmin: true },
    });

    if (key.userId) {
      notifyUser({
        orgId: key.orgId,
        userId: key.userId,
        type: "api_key.revoked",
        title: `API key "${key.name}" was revoked`,
        body: `Your API key "${key.name}" was revoked by a platform administrator. Reason: ${reason ?? "Manual"}.`,
        metadata: { apiKeyId: key.id, reason: reason ?? "Manual", viaPlatformAdmin: true },
      }).catch((error) =>
        logger.error({ err: error }, "failed to notify api-key.revoked (platform admin)"),
      );
    }

    return ok({ success: true }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
