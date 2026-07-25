/**
 * Live, in-session version of `src/server/services/analytics-service.ts`'s
 * `buildInsights()` — same deterministic, rule-based algorithm and
 * constants (windowed recent-vs-previous average delta, plus a trailing
 * decline-streak check), reimplemented here rather than imported because
 * that file's types come from `@prisma/client`, a server-only package that
 * shouldn't end up in the browser bundle. Nothing here is a model or a
 * prediction — every insight is a plain comparison over real scores this
 * session already computed.
 */

export type InsightTone = "positive" | "neutral" | "attention";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  description: string;
}

export interface LiveScoreSample {
  attention: number;
  posture: number;
  fatigue: number;
}

const WINDOW_SIZE = 3;
const NOTABLE_DELTA_PCT = 2;
const DECLINE_STREAK_THRESHOLD = 3;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function compareRecentWindows(
  samplesAsc: LiveScoreSample[],
  windowSize: number,
  metric: (s: LiveScoreSample) => number,
): { recentAvg: number; previousAvg: number; deltaPct: number } | null {
  if (samplesAsc.length < windowSize * 2) return null;
  const recent = samplesAsc.slice(-windowSize);
  const previous = samplesAsc.slice(-windowSize * 2, -windowSize);
  const recentAvg = average(recent.map(metric));
  const previousAvg = average(previous.map(metric));
  if (previousAvg === 0) return null;
  return { recentAvg, previousAvg, deltaPct: ((recentAvg - previousAvg) / previousAvg) * 100 };
}

function trailingDeclineStreak(
  samplesAsc: LiveScoreSample[],
  metric: (s: LiveScoreSample) => number,
): number {
  let streak = 0;
  for (let i = samplesAsc.length - 1; i > 0; i--) {
    if (metric(samplesAsc[i]!) < metric(samplesAsc[i - 1]!)) streak++;
    else break;
  }
  return streak;
}

const METRIC_DEFS: { key: string; label: string; metric: (s: LiveScoreSample) => number }[] = [
  { key: "attention", label: "Attention score", metric: (s) => s.attention },
  { key: "posture", label: "Posture score", metric: (s) => s.posture },
  // fatigueScore's own convention is "higher = more alert/less fatigued" —
  // framed here as "Energy" so an improving number reads as good news.
  { key: "energy", label: "Energy score", metric: (s) => s.fatigue },
];

/** Samples are oldest-first. Returns up to 4 insights, same as the server version. */
export function buildLiveInsights(samplesAsc: LiveScoreSample[]): Insight[] {
  const insights: Insight[] = [];

  for (const def of METRIC_DEFS) {
    if (insights.length >= 4) break;
    const comparison = compareRecentWindows(samplesAsc, WINDOW_SIZE, def.metric);
    if (!comparison) continue;
    const { deltaPct } = comparison;
    const magnitude = Math.abs(deltaPct);
    if (magnitude < NOTABLE_DELTA_PCT) continue;

    const improved = deltaPct > 0;
    const direction = improved ? "up" : "down";
    const tone: InsightTone = improved ? "positive" : magnitude >= 8 ? "attention" : "neutral";

    insights.push({
      id: `live_${def.key}_trend`,
      tone,
      title: `${def.label} ${direction} ${round1(magnitude)}% this session`,
      description: `Averaged ${round1(comparison.recentAvg)} recently vs ${round1(comparison.previousAvg)} just before.`,
    });
  }

  for (const def of METRIC_DEFS) {
    if (insights.length >= 4) break;
    if (insights.some((i) => i.id === `live_${def.key}_trend`)) continue;
    const streak = trailingDeclineStreak(samplesAsc, def.metric);
    if (streak >= DECLINE_STREAK_THRESHOLD) {
      insights.push({
        id: `live_${def.key}_streak`,
        tone: "attention",
        title: `${def.label} has dipped ${streak} checks in a row`,
        description: `Each recent check scored lower than the one before it.`,
      });
    }
  }

  return insights.slice(0, 4);
}
