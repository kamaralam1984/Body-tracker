import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { writeAudit } from "@/server/http/audit";
import { generateApiKey } from "@/server/auth/api-keys";
import { sanitizeApiKey } from "@/server/services/auth-service";
import { ALL_SCOPES, type Scope } from "@/server/db/entities";

export const dynamic = "force-dynamic";

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createSchema = z.object({
  name: z.string().min(1),
  scopes: z
    .array(z.string())
    .min(1)
    .refine((arr) => arr.every((s) => (ALL_SCOPES as string[]).includes(s)), {
      message: `scopes must only contain values from: ${ALL_SCOPES.join(", ")}`,
    }),
  rateLimitPerMinute: z.number().int().positive().default(120),
});

async function getOrgServiceAccount(orgId: string, id: string) {
  const prisma = await getPrisma();
  const account = await prisma.serviceAccount.findUnique({ where: { id } });
  if (!account || account.orgId !== orgId) throw notFound("Service account");
  return account;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "service-accounts:read");

    await getOrgServiceAccount(principal.orgId, id);
    const { cursor, limit } = parseQuery(request.nextUrl.searchParams, listQuerySchema);

    const prisma = await getPrisma();
    const keys = (
      await prisma.apiKey.findMany({
        where: { serviceAccountId: id },
        orderBy: { createdAt: "desc" },
      })
    ).map(sanitizeApiKey);

    const page = paginate(keys, cursor, limit);
    return ok(
      { items: page.items, nextCursor: page.nextCursor, total: page.total },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/** Issues a real machine-to-machine API key for this service account — scopes are exactly what's requested here, never inherited from any human role (a service account has no role). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await resolvePrincipal(request);
    requireScope(principal, "service-accounts:write");

    const account = await getOrgServiceAccount(principal.orgId, id);
    if (account.status !== "active") throw notFound("Service account");

    const body = await parseJsonBody(request, createSchema);
    const prisma = await getPrisma();
    const { plaintext, prefix, hash } = generateApiKey();

    const key = await prisma.apiKey.create({
      data: {
        orgId: principal.orgId,
        serviceAccountId: account.id,
        name: body.name,
        keyPrefix: prefix,
        keyHash: hash,
        scopes: body.scopes as Scope[],
        status: "active",
        rateLimitPerMinute: body.rateLimitPerMinute,
        requestCount: 0,
        lastUsedAt: null,
        expiresAt: null,
      },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "service-account.api-key-issued",
      target: `service-account:${account.id}`,
      metadata: { keyId: key.id, name: key.name, scopes: key.scopes },
    });

    return ok(
      { apiKey: plaintext, ...sanitizeApiKey(key) },
      { status: 201, headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
