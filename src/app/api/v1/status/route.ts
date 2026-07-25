import { getStore } from "@/server/db/store";
import { ok } from "@/server/http/respond";
import { snapshotMetrics } from "@/server/http/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  const mem = process.memoryUsage();

  return ok({
    status: "operational",
    version: "1.0.0",
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    metrics: snapshotMetrics(),
    dataStore: {
      kind: "in-memory (production target: PostgreSQL via Prisma)",
      organizations: store.organizations.size,
      users: store.users.size,
      trackingSessions: store.trackingSessions.size,
      reports: store.reports.size,
      webhooks: store.webhooks.size,
      apiKeys: store.apiKeys.size,
    },
  });
}
