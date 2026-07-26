import { NextRequest } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { snapshotMetrics } from "@/server/http/metrics";
import { beginRequestContext, logApiRequest } from "@/server/http/request-context";

export const dynamic = "force-dynamic";

/** Collapses id-like path segments (real cuid2 ids are ~24-25 lowercase
 * alphanumeric chars) into `:id` before using a path as a Prometheus label
 * — grouping by raw path would give every distinct session/report/webhook
 * id its own metric series, unbounded cardinality that gets worse forever
 * as more records are created. */
function normalizePathForMetrics(path: string): string {
  return path
    .split("/")
    .map((segment) => (/^[a-z0-9]{20,}$/i.test(segment) ? ":id" : segment))
    .join("/");
}

/** Escapes a Prometheus label value per the text exposition format (backslash and double-quote only — paths in this app never contain newlines). */
function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Real Prometheus text-exposition-format metrics — scrapeable as-is by a
 * real Prometheus instance (see deploy/monitoring/prometheus.yml). Process
 * metrics come from Node's own `process` API; data-store gauges reflect
 * real Postgres row counts; per-endpoint request/latency metrics are real
 * aggregates over the last 24h of `ApiRequestLog` rows (so they're already
 * correct across the whole PM2 cluster, not per-worker).
 *
 * Note: `btk_http_requests_total` (by status class only, no endpoint
 * label) still comes from the in-memory counter in
 * src/server/http/metrics.ts, which IS per-PM2-worker-process — a real
 * Prometheus setup scraping each worker (or summing across instances)
 * handles this naturally; the newer `btk_http_requests_by_endpoint_total`/
 * `btk_http_request_duration_ms_avg` metrics below don't have this
 * limitation since they're sourced from the shared database instead.
 */
export async function GET(request: NextRequest) {
  beginRequestContext(request);
  const prisma = await getPrisma();
  const metrics = snapshotMetrics();
  const mem = process.memoryUsage();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [organizations, users, trackingSessions, reports, webhooks, apiKeys, recentRequests] =
    await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.trackingSession.count(),
      prisma.report.count(),
      prisma.webhook.count(),
      prisma.apiKey.count(),
      prisma.apiRequestLog.findMany({
        where: { createdAt: { gte: since24h } },
        select: { method: true, path: true, statusCode: true, latencyMs: true },
      }),
    ]);

  const endpointStats = new Map<string, { count: number; totalLatencyMs: number }>();
  for (const row of recentRequests) {
    const key = `${row.method} ${normalizePathForMetrics(row.path)}`;
    const existing = endpointStats.get(key) ?? { count: 0, totalLatencyMs: 0 };
    existing.count += 1;
    existing.totalLatencyMs += row.latencyMs;
    endpointStats.set(key, existing);
  }

  const lines: string[] = [
    "# HELP btk_process_uptime_seconds Process uptime in seconds.",
    "# TYPE btk_process_uptime_seconds gauge",
    `btk_process_uptime_seconds ${process.uptime().toFixed(3)}`,

    "# HELP btk_process_resident_memory_bytes Resident set size in bytes.",
    "# TYPE btk_process_resident_memory_bytes gauge",
    `btk_process_resident_memory_bytes ${mem.rss}`,

    "# HELP btk_process_heap_used_bytes V8 heap used in bytes.",
    "# TYPE btk_process_heap_used_bytes gauge",
    `btk_process_heap_used_bytes ${mem.heapUsed}`,

    "# HELP btk_http_requests_total Total HTTP requests handled, by status class.",
    "# TYPE btk_http_requests_total counter",
    ...Object.entries(metrics.requestsByStatus).map(
      ([bucket, count]) => `btk_http_requests_total{status_class="${bucket}"} ${count}`,
    ),

    "# HELP btk_datastore_records Records currently held per entity in the database.",
    "# TYPE btk_datastore_records gauge",
    `btk_datastore_records{entity="organizations"} ${organizations}`,
    `btk_datastore_records{entity="users"} ${users}`,
    `btk_datastore_records{entity="tracking_sessions"} ${trackingSessions}`,
    `btk_datastore_records{entity="reports"} ${reports}`,
    `btk_datastore_records{entity="webhooks"} ${webhooks}`,
    `btk_datastore_records{entity="api_keys"} ${apiKeys}`,

    "# HELP btk_http_requests_by_endpoint_total Real request counts per endpoint over the last 24h, from ApiRequestLog.",
    "# TYPE btk_http_requests_by_endpoint_total counter",
    ...[...endpointStats.entries()].map(([key, stats]) => {
      const [method, path] = key.split(" ");
      return `btk_http_requests_by_endpoint_total{method="${method}",path="${escapeLabel(path)}"} ${stats.count}`;
    }),

    "# HELP btk_http_request_duration_ms_avg Real average request latency per endpoint over the last 24h, from ApiRequestLog.",
    "# TYPE btk_http_request_duration_ms_avg gauge",
    ...[...endpointStats.entries()].map(([key, stats]) => {
      const [method, path] = key.split(" ");
      const avg = stats.count > 0 ? stats.totalLatencyMs / stats.count : 0;
      return `btk_http_request_duration_ms_avg{method="${method}",path="${escapeLabel(path)}"} ${avg.toFixed(1)}`;
    }),
  ];

  logApiRequest(200);
  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
