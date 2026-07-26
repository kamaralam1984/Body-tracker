import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";

export const dynamic = "force-dynamic";

export const querySchema = z.object({
  inactiveDays: z.coerce.number().int().positive().max(365).default(30),
  nearExpirationDays: z.coerce.number().int().positive().max(90).default(14),
});

/**
 * Real Security Center data — every section here is a genuine query
 * against real tables, not a mocked dashboard:
 *
 * - inactiveKeys / nearExpirationKeys / compromisedKeys: real `ApiKey` rows.
 * - failedAuthSpikes: real `ApiRequestLog` rows (401s in the last 24h,
 *   grouped by API key) — no new logging needed, this table already
 *   existed for API usage analytics.
 *
 * "Compromised keys" is honestly manual-flag-only (the `revokedReason`
 * field from the revoke endpoint) — real automated leaked-key scanning
 * would need an external detection service this app doesn't have, so
 * this never fabricates a "detected" result.
 */
export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "api-keys:read");

    const { inactiveDays, nearExpirationDays } = parseQuery(
      request.nextUrl.searchParams,
      querySchema,
    );
    const prisma = await getPrisma();
    const now = Date.now();
    const inactiveSince = new Date(now - inactiveDays * 24 * 60 * 60 * 1000);
    const nearExpirationBy = new Date(now + nearExpirationDays * 24 * 60 * 60 * 1000);
    const failedAuthSince = new Date(now - 24 * 60 * 60 * 1000);

    const [inactiveKeys, expiredKeys, nearExpirationKeys, compromisedKeys, failedAuthRows] =
      await Promise.all([
        prisma.apiKey.findMany({
          where: {
            orgId: principal.orgId,
            status: "active",
            OR: [
              { lastUsedAt: null, createdAt: { lt: inactiveSince } },
              { lastUsedAt: { lt: inactiveSince } },
            ],
          },
          select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
        }),
        // Should be empty in steady state (the sweep in
        // src/server/services/api-keys-service.ts auto-revokes these) —
        // included anyway as a real safety-visibility check, not assumed.
        prisma.apiKey.findMany({
          where: { orgId: principal.orgId, status: "active", expiresAt: { lt: new Date(now) } },
          select: { id: true, name: true, keyPrefix: true, expiresAt: true },
        }),
        prisma.apiKey.findMany({
          where: {
            orgId: principal.orgId,
            status: "active",
            expiresAt: { gte: new Date(now), lt: nearExpirationBy },
          },
          select: { id: true, name: true, keyPrefix: true, expiresAt: true },
        }),
        prisma.apiKey.findMany({
          where: { orgId: principal.orgId, status: "revoked", revokedReason: "Compromised" },
          select: { id: true, name: true, keyPrefix: true },
        }),
        prisma.apiRequestLog.findMany({
          where: { orgId: principal.orgId, statusCode: 401, createdAt: { gte: failedAuthSince } },
          select: { apiKeyId: true, ip: true, path: true, createdAt: true },
        }),
      ]);

    const spikesByKey = new Map<
      string,
      { apiKeyId: string; count: number; lastAttemptAt: Date; ips: Set<string> }
    >();
    for (const row of failedAuthRows) {
      const key = row.apiKeyId ?? "unknown";
      const existing = spikesByKey.get(key) ?? {
        apiKeyId: key,
        count: 0,
        lastAttemptAt: row.createdAt,
        ips: new Set<string>(),
      };
      existing.count += 1;
      if (row.createdAt > existing.lastAttemptAt) existing.lastAttemptAt = row.createdAt;
      if (row.ip) existing.ips.add(row.ip);
      spikesByKey.set(key, existing);
    }
    const failedAuthSpikes = [...spikesByKey.values()]
      .map((s) => ({
        apiKeyId: s.apiKeyId === "unknown" ? null : s.apiKeyId,
        count: s.count,
        distinctIps: s.ips.size,
        lastAttemptAt: s.lastAttemptAt,
      }))
      .sort((a, b) => b.count - a.count);

    return ok(
      {
        inactiveDays,
        nearExpirationDays,
        inactiveKeys,
        expiredKeys,
        nearExpirationKeys,
        compromisedKeys,
        failedAuthSpikes,
      },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
