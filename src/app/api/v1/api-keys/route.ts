import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { writeAudit } from "@/server/http/audit";
import { generateApiKey } from "@/server/auth/api-keys";
import { ALL_SCOPES, type Scope } from "@/server/db/entities";
import { sanitizeApiKey } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:read");
    const { cursor, limit } = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    const prisma = await getPrisma();
    const orgKeys = (
      await prisma.apiKey.findMany({
        where: { orgId: principal.orgId },
        orderBy: { createdAt: "asc" },
      })
    ).map(sanitizeApiKey);
    const { items, nextCursor, total } = paginate(orgKeys, cursor, limit);
    return ok({ items, nextCursor, total }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  scopes: z
    .array(z.string())
    .min(1)
    .refine((arr) => arr.every((s) => (ALL_SCOPES as string[]).includes(s)), {
      message: `scopes must only contain values from: ${ALL_SCOPES.join(", ")}`,
    })
    .transform((arr) => arr as Scope[]),
  rateLimitPerMinute: z.number().int().positive().default(120),
});

export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:write");
    const body = await parseJsonBody(request, createSchema);
    const prisma = await getPrisma();
    const { plaintext, prefix, hash } = generateApiKey();

    const key = await prisma.apiKey.create({
      data: {
        orgId: principal.orgId,
        userId: principal.userId,
        name: body.name,
        keyPrefix: prefix,
        keyHash: hash,
        scopes: body.scopes,
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
      action: "api-key.created",
      target: `api-key:${key.id}`,
      metadata: { name: key.name, scopes: key.scopes },
    });

    return ok(
      { apiKey: plaintext, ...sanitizeApiKey(key) },
      { status: 201, headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
