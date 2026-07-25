/** Minimal in-process request counters for the /health and /status endpoints. */

interface Metrics {
  startedAt: number;
  requestsTotal: number;
  requestsByStatus: Record<string, number>;
}

declare global {
  var __btkMetrics: Metrics | undefined;
}

function getMetrics(): Metrics {
  if (!globalThis.__btkMetrics) {
    globalThis.__btkMetrics = { startedAt: Date.now(), requestsTotal: 0, requestsByStatus: {} };
  }
  return globalThis.__btkMetrics;
}

export function recordRequest(status: number) {
  const metrics = getMetrics();
  metrics.requestsTotal += 1;
  const bucket = `${Math.floor(status / 100)}xx`;
  metrics.requestsByStatus[bucket] = (metrics.requestsByStatus[bucket] ?? 0) + 1;
}

export function snapshotMetrics() {
  const metrics = getMetrics();
  return {
    uptimeSeconds: Math.round((Date.now() - metrics.startedAt) / 1000),
    requestsTotal: metrics.requestsTotal,
    requestsByStatus: metrics.requestsByStatus,
  };
}
