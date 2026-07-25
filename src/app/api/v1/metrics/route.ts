import { getPrisma } from "@/server/db/prisma";
import { snapshotMetrics } from "@/server/http/metrics";

export const dynamic = "force-dynamic";

/**
 * Real Prometheus text-exposition-format metrics — scrapeable as-is by a
 * real Prometheus instance (see deploy/monitoring/prometheus.yml). Process
 * metrics come from Node's own `process` API; request counters are the same
 * ones every route increments via src/server/http/respond.ts's ok()/
 * errorResponse(); data-store gauges reflect the real Postgres row counts.
 *
 * Note: request counters are per-PM2-worker-process (each cluster worker
 * has its own in-memory counter, not aggregated across the cluster) — a
 * real Prometheus setup scraping each worker or summing across instances
 * handles this naturally; see docs/ops/monitoring-guide.md.
 */
export async function GET() {
  const prisma = await getPrisma();
  const metrics = snapshotMetrics();
  const mem = process.memoryUsage();

  const [organizations, users, trackingSessions, reports, webhooks, apiKeys] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.trackingSession.count(),
    prisma.report.count(),
    prisma.webhook.count(),
    prisma.apiKey.count(),
  ]);

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
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
