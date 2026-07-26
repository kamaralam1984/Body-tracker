import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { ApiError, notFound } from "@/server/http/errors";
import { parseJsonBody } from "@/server/http/validate";
import { writeAudit } from "@/server/http/audit";
import { sanitizeApiKey } from "@/server/services/auth-service";
import { ALL_SCOPES, type Scope } from "@/server/db/entities";
import { notifyUser } from "@/server/services/notifications-service";
import { logger } from "@/server/logging/logger";

export const dynamic = "force-dynamic";

const REVOKE_REASONS = [
  "Compromised",
  "Unused",
  "Employee Left",
  "Testing Complete",
  "Manual",
] as const;

export const revokeSchema = z.object({
  reason: z.enum(REVOKE_REASONS).optional(),
});

export const patchSchema = z.object({
  name: z.string().min(1).optional(),
  scopes: z
    .array(z.string())
    .min(1)
    .refine((arr) => arr.every((s) => (ALL_SCOPES as string[]).includes(s)), {
      message: `scopes must only contain values from: ${ALL_SCOPES.join(", ")}`,
    })
    .optional(),
});

/** Real scope editing — scopes were immutable after creation until now. Writes a real "api-key.permission_changed" audit event with the actual before/after scope arrays. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:write");
    const { id } = await params;

    const body = await parseJsonBody(request, patchSchema);
    const prisma = await getPrisma();
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.orgId !== principal.orgId) throw notFound("API key");

    const key = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.scopes !== undefined ? { scopes: body.scopes as Scope[] } : {}),
      },
    });

    if (body.scopes !== undefined) {
      writeAudit({
        orgId: principal.orgId,
        actorId: principal.userId,
        action: "api-key.permission_changed",
        target: `api-key:${key.id}`,
        metadata: { before: existing.scopes, after: key.scopes },
      });

      if (key.userId) {
        notifyUser({
          orgId: key.orgId,
          userId: key.userId,
          type: "api_key.permission_changed",
          title: `Permissions changed on "${key.name}"`,
          body: `The scopes on your API key "${key.name}" were updated.`,
          metadata: { apiKeyId: key.id, before: existing.scopes, after: key.scopes },
        }).catch((error) =>
          logger.error({ err: error }, "failed to notify api-key.permission_changed"),
        );
      }
    }

    return ok(sanitizeApiKey(key), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:write");
    const { id } = await params;

    const rawBody = await request.text();
    let reason: (typeof REVOKE_REASONS)[number] | undefined;
    if (rawBody.length > 0) {
      const parsed = revokeSchema.safeParse(JSON.parse(rawBody));
      if (!parsed.success) {
        throw new ApiError("validation_error", "Invalid request body", parsed.error.flatten());
      }
      reason = parsed.data.reason;
    }

    const prisma = await getPrisma();
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.orgId !== principal.orgId) throw notFound("API key");

    await prisma.apiKey.update({
      where: { id },
      data: { status: "revoked", revokedReason: reason ?? "Manual" },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "api-key.revoked",
      target: `api-key:${key.id}`,
      metadata: { reason: reason ?? "Manual" },
    });

    if (key.userId) {
      notifyUser({
        orgId: key.orgId,
        userId: key.userId,
        type: "api_key.revoked",
        title: `API key "${key.name}" was revoked`,
        body: `Your API key "${key.name}" was revoked. Reason: ${reason ?? "Manual"}.`,
        metadata: { apiKeyId: key.id, reason: reason ?? "Manual" },
      }).catch((error) => logger.error({ err: error }, "failed to notify api-key.revoked"));
    }

    return ok({ success: true }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
