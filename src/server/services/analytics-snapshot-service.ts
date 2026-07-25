import { getPrisma } from "@/server/db/prisma";
import { nextRunningAverage } from "@/server/services/tracking-service";

/**
 * Write-side helpers for `AnalyticsSnapshot` — kept separate from
 * `analytics-service.ts` (which is deliberately pure: aggregation/insight
 * math over already-fetched rows, no Prisma). These two callers populate
 * real values into a table that, before Phase 1, had a schema but no writer
 * anywhere in the app — `analytics-service.ts`'s `summarize()`/`buildInsights()`
 * (already real, already wired to `/api/v1/analytics/*`) start reflecting
 * genuine tracking data as soon as these run.
 */

/** Midnight UTC for the given day — matches `analytics-service.ts`'s date-only convention. */
function dateOnlyUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Called on every `/metrics` ingestion — recomputes today's focus/posture
 * scores as the average of every `TrackingMetricSample` window so far today
 * (not just the latest window), then upserts them onto today's snapshot row
 * without touching the session-derived columns (`activeMinutes` etc., see
 * `recordSessionCompletion` below).
 */
export async function refreshTodayFocusPostureScores(
  orgId: string,
  userId: string,
  now: Date,
): Promise<void> {
  const prisma = await getPrisma();
  const date = dateOnlyUTC(now);
  const todayStart = date;
  const todayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const aggregate = await prisma.trackingMetricSample.aggregate({
    where: { orgId, userId, windowStart: { gte: todayStart, lt: todayEnd } },
    _avg: { attentionScore: true, postureScore: true },
  });

  const focusScore = aggregate._avg.attentionScore ?? 0;
  const postureScore = aggregate._avg.postureScore ?? 0;

  await prisma.analyticsSnapshot.upsert({
    where: { userId_date: { userId, date } },
    update: { focusScore, postureScore },
    create: {
      orgId,
      userId,
      date,
      activeMinutes: 0,
      sessionsCompleted: 0,
      repsTotal: 0,
      avgFormScore: 0,
      focusScore,
      postureScore,
    },
  });
}

/**
 * Called when a `TrackingSession` completes — folds its duration/rep/form
 * data into that day's snapshot. These columns never had a writer before
 * Phase 1 (only `prisma/seed.ts` faked historical rows), so `summarize()`'s
 * `activeMinutesTotal`/`sessionsCompletedTotal`/`repsTotalTotal`/`avgFormScore`
 * become genuine once this runs.
 */
export async function recordSessionCompletion(
  orgId: string,
  userId: string,
  session: { endedAt: Date; durationSeconds: number; repCount: number; avgFormScore: number },
): Promise<void> {
  const prisma = await getPrisma();
  const date = dateOnlyUTC(session.endedAt);

  const existing = await prisma.analyticsSnapshot.findUnique({
    where: { userId_date: { userId, date } },
  });

  const activeMinutesDelta = Math.round(session.durationSeconds / 60);

  if (!existing) {
    await prisma.analyticsSnapshot.create({
      data: {
        orgId,
        userId,
        date,
        activeMinutes: activeMinutesDelta,
        sessionsCompleted: 1,
        repsTotal: session.repCount,
        avgFormScore: session.avgFormScore,
        focusScore: 0,
        postureScore: 0,
      },
    });
    return;
  }

  await prisma.analyticsSnapshot.update({
    where: { userId_date: { userId, date } },
    data: {
      activeMinutes: existing.activeMinutes + activeMinutesDelta,
      sessionsCompleted: existing.sessionsCompleted + 1,
      repsTotal: existing.repsTotal + session.repCount,
      avgFormScore: nextRunningAverage(
        existing.avgFormScore,
        existing.sessionsCompleted,
        session.avgFormScore,
      ),
    },
  });
}
