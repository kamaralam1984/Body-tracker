import { getPrisma } from "@/server/db/prisma";
import { ok } from "@/server/http/respond";
import { snapshotMetrics } from "@/server/http/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const prisma = await getPrisma();
  const mem = process.memoryUsage();

  const [organizations, users, trackingSessions, reports, webhooks, apiKeys] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.trackingSession.count(),
    prisma.report.count(),
    prisma.webhook.count(),
    prisma.apiKey.count(),
  ]);

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
      kind: "postgresql (Neon, via Prisma)",
      organizations,
      users,
      trackingSessions,
      reports,
      webhooks,
      apiKeys,
    },
  });
}
