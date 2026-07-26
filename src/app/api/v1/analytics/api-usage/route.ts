import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { parseQuery } from "@/server/http/validate";
import { classifyUserAgent } from "@/server/http/user-agent";

export const dynamic = "force-dynamic";

// Bounds how many recent rows are pulled into memory for the derived
// per-row breakdowns (top endpoints, device mix, requests/minute) — the
// headline totals (totalRequests/successRate/avgLatencyMs) are always
// exact real-DB aggregates regardless of this cap; `sampled: true` in the
// response tells the caller honestly when the breakdowns are over a
// bounded recent sample rather than the full range.
const BREAKDOWN_SAMPLE_LIMIT = 5000;
const RECENT_MINUTES_WINDOW = 30;

export const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
});

export async function GET(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "analytics:read");

    const query = parseQuery(request.nextUrl.searchParams, querySchema);
    const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);
    const where = { orgId: principal.orgId, createdAt: { gte: since } };

    const prisma = await getPrisma();

    const [totalRequests, successCount, latencyAgg, sample] = await Promise.all([
      prisma.apiRequestLog.count({ where }),
      prisma.apiRequestLog.count({ where: { ...where, statusCode: { lt: 400 } } }),
      prisma.apiRequestLog.aggregate({ where, _avg: { latencyMs: true } }),
      prisma.apiRequestLog.findMany({
        where,
        select: { method: true, path: true, statusCode: true, userAgent: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: BREAKDOWN_SAMPLE_LIMIT,
      }),
    ]);

    const errorCount = totalRequests - successCount;

    const requestsByStatusClass: Record<string, number> = {};
    const endpointCounts = new Map<string, number>();
    const methodCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();

    for (const row of sample) {
      const statusBucket = `${Math.floor(row.statusCode / 100)}xx`;
      requestsByStatusClass[statusBucket] = (requestsByStatusClass[statusBucket] ?? 0) + 1;

      const endpointKey = `${row.method} ${row.path}`;
      endpointCounts.set(endpointKey, (endpointCounts.get(endpointKey) ?? 0) + 1);

      methodCounts.set(row.method, (methodCounts.get(row.method) ?? 0) + 1);

      const device = classifyUserAgent(row.userAgent);
      deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
    }

    const topEndpoints = [...endpointCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [method, ...pathParts] = key.split(" ");
        return { method, path: pathParts.join(" "), count };
      });

    const byMethod = [...methodCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([method, count]) => ({ method, count }));

    const deviceBreakdown = [...deviceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

    const now = Date.now();
    const requestsPerMinuteRecent = Array.from({ length: RECENT_MINUTES_WINDOW }, (_, i) => {
      const bucketIndex = RECENT_MINUTES_WINDOW - 1 - i;
      const bucketStart = now - bucketIndex * 60_000;
      const bucketEnd = bucketStart + 60_000;
      const count = sample.filter((row) => {
        const t = row.createdAt.getTime();
        return t >= bucketStart && t < bucketEnd;
      }).length;
      return { minute: new Date(bucketStart).toISOString(), count };
    });

    return ok(
      {
        rangeDays: query.days,
        sampled: totalRequests > sample.length,
        totalRequests,
        successRate:
          totalRequests > 0 ? Math.round((successCount / totalRequests) * 1000) / 10 : null,
        errorRate: totalRequests > 0 ? Math.round((errorCount / totalRequests) * 1000) / 10 : null,
        avgLatencyMs:
          latencyAgg._avg.latencyMs !== null ? Math.round(latencyAgg._avg.latencyMs) : null,
        requestsByStatusClass,
        topEndpoints,
        byMethod,
        deviceBreakdown,
        requestsPerMinuteRecent,
      },
      { headers: rateLimitResponseHeaders(principal) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
