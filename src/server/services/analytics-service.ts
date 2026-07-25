import type { AnalyticsSnapshot } from "@prisma/client";

/**
 * Aggregation + insight helpers for the Analytics domain.
 *
 * The "insights" produced here are NOT AI/ML — they are plain deterministic
 * numeric comparisons over real snapshot data (e.g. averaging the most
 * recent N snapshots vs the previous N and describing the delta in plain
 * language). This matches the project's established "no AI branding"
 * convention: nothing here is a model, a prediction, or a generated guess.
 *
 * Snapshot rows are fetched via Prisma (see the analytics/* routes), so
 * `date` here is a real `Date` (Postgres DATE column, midnight UTC) rather
 * than the ISO date string the old in-memory store used — every date
 * comparison below operates on `Date` objects accordingly, but the
 * aggregation/insight math itself is unchanged.
 */

export interface AnalyticsSummary {
  from: string;
  to: string;
  daysCovered: number;
  activeMinutesTotal: number;
  sessionsCompletedTotal: number;
  repsTotalTotal: number;
  avgFormScore: number;
  avgFocusScore: number;
  avgPostureScore: number;
}

export type InsightTone = "positive" | "neutral" | "attention";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  description: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Sorts snapshots by date ascending (oldest first). Does not mutate the input array. */
export function sortByDateAsc(snapshots: AnalyticsSnapshot[]): AnalyticsSnapshot[] {
  return [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Filters snapshots to those with `date` within the inclusive `[from, to]` range (`from`/`to` are YYYY-MM-DD date-only strings; compared against the Date-typed `date` column at midnight UTC). */
export function filterByDateRange(
  snapshots: AnalyticsSnapshot[],
  from: string,
  to: string,
): AnalyticsSnapshot[] {
  const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
  const toMs = new Date(`${to}T00:00:00.000Z`).getTime();
  return snapshots.filter((s) => s.date.getTime() >= fromMs && s.date.getTime() <= toMs);
}

/** Builds the totals + averages summary for a set of snapshots already scoped to org/user/date-range. */
export function summarize(
  snapshots: AnalyticsSnapshot[],
  from: string,
  to: string,
): AnalyticsSummary {
  const activeMinutesTotal = snapshots.reduce((sum, s) => sum + s.activeMinutes, 0);
  const sessionsCompletedTotal = snapshots.reduce((sum, s) => sum + s.sessionsCompleted, 0);
  const repsTotalTotal = snapshots.reduce((sum, s) => sum + s.repsTotal, 0);

  return {
    from,
    to,
    daysCovered: snapshots.length,
    activeMinutesTotal,
    sessionsCompletedTotal,
    repsTotalTotal,
    avgFormScore: round1(average(snapshots.map((s) => s.avgFormScore))),
    avgFocusScore: round1(average(snapshots.map((s) => s.focusScore))),
    avgPostureScore: round1(average(snapshots.map((s) => s.postureScore))),
  };
}

/**
 * Compares the average of the most-recent `windowSize` snapshots against the
 * average of the `windowSize` snapshots immediately preceding them, for a
 * single numeric metric. Returns null when there isn't enough history for
 * both windows (we prefer omitting an insight over fabricating one).
 */
function compareRecentWindows(
  snapshotsAsc: AnalyticsSnapshot[],
  windowSize: number,
  metric: (s: AnalyticsSnapshot) => number,
): { recentAvg: number; previousAvg: number; deltaPct: number } | null {
  if (snapshotsAsc.length < windowSize * 2) return null;

  const recent = snapshotsAsc.slice(-windowSize);
  const previous = snapshotsAsc.slice(-windowSize * 2, -windowSize);

  const recentAvg = average(recent.map(metric));
  const previousAvg = average(previous.map(metric));

  if (previousAvg === 0) return null;

  const deltaPct = ((recentAvg - previousAvg) / previousAvg) * 100;
  return { recentAvg, previousAvg, deltaPct };
}

/** Detects a run of consecutive-day declines in a metric ending at the most recent snapshot. Returns the run length (0 or 1 means no notable streak). */
function trailingDeclineStreak(
  snapshotsAsc: AnalyticsSnapshot[],
  metric: (s: AnalyticsSnapshot) => number,
): number {
  let streak = 0;
  for (let i = snapshotsAsc.length - 1; i > 0; i--) {
    if (metric(snapshotsAsc[i]) < metric(snapshotsAsc[i - 1])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const WINDOW_SIZE = 3;
const NOTABLE_DELTA_PCT = 2; // below this magnitude we call the trend "flat" / neutral
const DECLINE_STREAK_THRESHOLD = 3; // consecutive days worsening before flagging as "attention"

/**
 * Builds 2-4 deterministic, rule-based insight objects by comparing the most
 * recent snapshots against the ones before them (recency-weighted moving
 * average deltas) plus simple consecutive-day-decline detection. Every
 * insight is traceable to a concrete numeric comparison in real snapshot
 * data — nothing is generated or predicted.
 */
export function buildInsights(snapshots: AnalyticsSnapshot[]): Insight[] {
  const asc = sortByDateAsc(snapshots);
  const insights: Insight[] = [];

  const metricDefs: Array<{
    key: string;
    label: string;
    metric: (s: AnalyticsSnapshot) => number;
    higherIsBetter: boolean;
  }> = [
    { key: "form", label: "Form score", metric: (s) => s.avgFormScore, higherIsBetter: true },
    { key: "focus", label: "Focus score", metric: (s) => s.focusScore, higherIsBetter: true },
    { key: "posture", label: "Posture score", metric: (s) => s.postureScore, higherIsBetter: true },
  ];

  for (const def of metricDefs) {
    if (insights.length >= 4) break;

    const comparison = compareRecentWindows(asc, WINDOW_SIZE, def.metric);
    if (!comparison) continue;

    const { deltaPct } = comparison;
    const improved = def.higherIsBetter ? deltaPct > 0 : deltaPct < 0;
    const magnitude = Math.abs(deltaPct);

    if (magnitude < NOTABLE_DELTA_PCT) continue;

    const direction = improved ? "up" : "down";
    const tone: InsightTone = improved ? "positive" : magnitude >= 8 ? "attention" : "neutral";

    insights.push({
      id: `insight_${def.key}_trend`,
      tone,
      title: `${def.label} ${direction} ${round1(magnitude)}% this week`,
      description: `Averaged ${round1(comparison.recentAvg)} over the last ${WINDOW_SIZE} sessions vs ${round1(comparison.previousAvg)} over the previous ${WINDOW_SIZE}.`,
    });
  }

  // Consecutive-day decline streaks — a distinct signal from the windowed average comparison above.
  for (const def of metricDefs) {
    if (insights.length >= 4) break;
    if (insights.some((i) => i.id === `insight_${def.key}_trend` && i.tone === "attention"))
      continue;

    const streak = trailingDeclineStreak(asc, def.metric);
    if (streak >= DECLINE_STREAK_THRESHOLD) {
      insights.push({
        id: `insight_${def.key}_streak`,
        tone: "attention",
        title: `${def.label} has dipped ${streak} days in a row`,
        description: `Each of the last ${streak} sessions scored lower on ${def.label.toLowerCase()} than the session before it.`,
      });
    }
  }

  return insights.slice(0, 4);
}
