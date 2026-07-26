import { NextRequest } from "next/server";
import { z } from "zod";
import ipaddr from "ipaddr.js";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { badRequest } from "@/server/http/errors";
import { parseJsonBody, parseQuery } from "@/server/http/validate";
import { paginate } from "@/server/http/pagination";
import { parseSort, searchWhere } from "@/server/http/sort";
import { writeAudit } from "@/server/http/audit";
import { generateApiKey, isScopeGrantableToPublishableKey } from "@/server/auth/api-keys";
import { ALL_SCOPES, type Scope } from "@/server/db/entities";
import { sanitizeApiKey } from "@/server/services/auth-service";
import { notifyUser } from "@/server/services/notifications-service";
import { logger } from "@/server/logging/logger";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["name", "status", "createdAt", "lastUsedAt"] as const;
const SEARCHABLE_FIELDS = ["name"] as const;

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  search: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:read");
    const { cursor, limit, sort, search } = parseQuery(
      request.nextUrl.searchParams,
      listQuerySchema,
    );
    const prisma = await getPrisma();
    const orderBy = parseSort(sort, SORTABLE_FIELDS);
    const orgKeys = (
      await prisma.apiKey.findMany({
        where: { orgId: principal.orgId, ...searchWhere(search, SEARCHABLE_FIELDS) },
        orderBy: orderBy.length > 0 ? orderBy : { createdAt: "asc" },
      })
    ).map(sanitizeApiKey);
    const { items, nextCursor, total } = paginate(orgKeys, cursor, limit);
    return ok({ items, nextCursor, total }, { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

function isValidIpOrCidr(entry: string): boolean {
  return entry.includes("/") ? ipaddr.isValidCIDR(entry) : ipaddr.isValid(entry);
}

function isValidOriginPattern(entry: string): boolean {
  const hostnamePart = entry.startsWith("*.") ? entry.slice(2) : entry;
  return hostnamePart.length > 0 && !hostnamePart.includes("/") && !hostnamePart.includes(" ");
}

export const createSchema = z.object({
  name: z.string().min(1),
  scopes: z
    .array(z.string())
    .min(1)
    .refine((arr) => arr.every((s) => (ALL_SCOPES as string[]).includes(s)), {
      message: `scopes must only contain values from: ${ALL_SCOPES.join(", ")}`,
    })
    .transform((arr) => arr as Scope[]),
  rateLimitPerMinute: z.number().int().positive().default(120),
  // Never-expires when omitted (today's existing behavior). A concrete
  // ISO date — the UI computes this from a Never/30d/90d/180d/365d/Custom
  // picker; the API itself just accepts a real timestamp, not a preset
  // name, keeping the contract simple for direct API callers too.
  expiresAt: z.string().datetime().optional(),
  allowedIps: z
    .array(z.string())
    .default([])
    .refine((arr) => arr.every(isValidIpOrCidr), {
      message: "allowedIps entries must each be a valid IP address or CIDR range",
    }),
  allowedOrigins: z
    .array(z.string())
    .default([])
    .refine((arr) => arr.every(isValidOriginPattern), {
      message: "allowedOrigins entries must each be a hostname, optionally prefixed with '*.'",
    }),
  // Stripe-style test/live separation — real key-prefix encoding
  // (sk_live_/sk_test_/pk_live_/pk_test_), not full data-environment
  // isolation (this app has one real database, not separate test/live
  // datasets — see INCOMPLETE.md for why that's explicitly out of scope).
  environment: z.enum(["test", "live"]).default("live"),
  keyType: z.enum(["secret", "publishable"]).default("secret"),
});

export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:write");
    const body = await parseJsonBody(request, createSchema);
    if (body.expiresAt && new Date(body.expiresAt).getTime() <= Date.now()) {
      throw badRequest("expiresAt must be in the future");
    }
    if (body.keyType === "publishable" && !body.scopes.every(isScopeGrantableToPublishableKey)) {
      throw badRequest(
        "Publishable keys can't be granted write scopes — they're meant to be safe in client-side code.",
      );
    }

    const prisma = await getPrisma();
    const { plaintext, prefix, hash } = generateApiKey({
      environment: body.environment,
      keyType: body.keyType,
    });

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
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        allowedIps: body.allowedIps,
        allowedOrigins: body.allowedOrigins,
        environment: body.environment,
        keyType: body.keyType,
      },
    });

    writeAudit({
      orgId: principal.orgId,
      actorId: principal.userId,
      action: "api-key.created",
      target: `api-key:${key.id}`,
      metadata: { name: key.name, scopes: key.scopes },
    });

    // Only human principals map to a real `User` row — a service account
    // acting on its own behalf has no personal inbox to notify.
    if (!principal.serviceAccountId) {
      notifyUser({
        orgId: principal.orgId,
        userId: principal.userId,
        type: "api_key.created",
        title: `New API key created: "${key.name}"`,
        body: `A new ${key.environment} ${key.keyType} key "${key.name}" was created on your account.`,
        metadata: { apiKeyId: key.id },
      }).catch((error) => logger.error({ err: error }, "failed to notify api-key.created"));
    }

    return ok(
      { apiKey: plaintext, ...sanitizeApiKey(key) },
      { status: 201, headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
