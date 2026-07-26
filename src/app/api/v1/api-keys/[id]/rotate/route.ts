import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { ApiError, notFound } from "@/server/http/errors";
import { writeAudit } from "@/server/http/audit";
import { generateApiKey } from "@/server/auth/api-keys";
import { sanitizeApiKey } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const DEFAULT_GRACE_HOURS = 24;

export const rotateSchema = z.object({
  // Configurable mainly so this is actually testable end-to-end without
  // waiting 24 real hours — real callers should just omit it.
  graceHours: z.number().min(0).max(720).optional(),
});

/**
 * Real rotation with a grace period — NOT an instant destructive swap.
 * Creates a brand-new key row (new secret, same org/owner/scopes/limits/
 * restrictions) and marks the OLD row's `gracePeriodEndsAt`; both
 * authenticate successfully until that passes (enforced in
 * `resolvePrincipal`), then the sweep in `src/instrumentation.ts` revokes
 * the old one. Rotation history isn't a separate table — it's derived
 * from the real `AuditLogEntry` rows this writes, queryable via
 * `/api/v1/api-keys/[id]/rotation-history`.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:write");
    const { id } = await params;

    const rawBody = await request.text();
    let graceHours = DEFAULT_GRACE_HOURS;
    if (rawBody.length > 0) {
      const parsed = rotateSchema.safeParse(JSON.parse(rawBody));
      if (!parsed.success) {
        throw new ApiError("validation_error", "Invalid request body", parsed.error.flatten());
      }
      graceHours = parsed.data.graceHours ?? DEFAULT_GRACE_HOURS;
    }

    const prisma = await getPrisma();
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.orgId !== principal.orgId) throw notFound("API key");
    if (existing.status !== "active") {
      throw new ApiError("conflict", "Cannot rotate a key that isn't active.");
    }

    const { plaintext, prefix, hash } = generateApiKey();
    const gracePeriodEndsAt = new Date(Date.now() + graceHours * 60 * 60 * 1000);

    const [, newKey] = await prisma.$transaction([
      prisma.apiKey.update({ where: { id: existing.id }, data: { gracePeriodEndsAt } }),
      prisma.apiKey.create({
        data: {
          orgId: existing.orgId,
          userId: existing.userId,
          serviceAccountId: existing.serviceAccountId,
          name: existing.name,
          keyPrefix: prefix,
          keyHash: hash,
          scopes: existing.scopes,
          status: "active",
          rateLimitPerMinute: existing.rateLimitPerMinute,
          requestCount: 0,
          lastUsedAt: null,
          expiresAt: existing.expiresAt,
          allowedIps: existing.allowedIps,
          allowedOrigins: existing.allowedOrigins,
          environment: existing.environment,
          keyType: existing.keyType,
          supersedesId: existing.id,
        },
      }),
    ]);

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "api-key.rotated",
      target: `api-key:${newKey.id}`,
      metadata: {
        oldKeyId: existing.id,
        graceHours,
        gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
      },
    });

    return ok(
      {
        apiKey: plaintext,
        ...sanitizeApiKey(newKey),
        oldKeyId: existing.id,
        gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
      },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
