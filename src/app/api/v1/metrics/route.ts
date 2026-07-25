import { getStore } from "@/server/db/store";
import { snapshotMetrics } from "@/server/http/metrics";

export const dynamic = "force-dynamic";

/**
 * Real Prometheus text-exposition-format metrics — scrapeable as-is by a
 * real Prometheus instance (see deploy/monitoring/prometheus.yml). Process
 * metrics come from Node's own `process` API; request counters are the same
 * ones every route increments via src/server/http/respond.ts's ok()/
 * errorResponse(); data-store gauges reflect the real in-memory store size.
 */
export async function GET() {
  const store = getStore();
  const metrics = snapshotMetrics();
  const mem = process.memoryUsage();

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

    "# HELP btk_datastore_records Records currently held per entity in the data store.",
    "# TYPE btk_datastore_records gauge",
    `btk_datastore_records{entity="organizations"} ${store.organizations.size}`,
    `btk_datastore_records{entity="users"} ${store.users.size}`,
    `btk_datastore_records{entity="tracking_sessions"} ${store.trackingSessions.size}`,
    `btk_datastore_records{entity="reports"} ${store.reports.size}`,
    `btk_datastore_records{entity="webhooks"} ${store.webhooks.size}`,
    `btk_datastore_records{entity="api_keys"} ${store.apiKeys.size}`,
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
