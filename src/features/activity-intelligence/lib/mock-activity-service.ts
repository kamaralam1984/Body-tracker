/**
 * Placeholder activity-intelligence data — no backend exists yet. Deterministic
 * (seeded) generation, same artificial-latency Promise convention used by every
 * other mock service in this app. Live activity "cards" are a point-in-time
 * snapshot (like every other mock service here) rather than a faked real-time
 * ticker — there is no live backend connection for this module, and pretending
 * otherwise would be dishonest UI, not a premium one.
 */

import type {
  ActivityDetectionState,
  ActivityDistributionPoint,
  ActivityHeatmapPoint,
  ActivityHistoryEntry,
  ActivityKind,
  ActivityStatistics,
  ActivityTimelineEvent,
  ActivityTimelineEventType,
  ConfidenceLevel,
  DailyActivityPoint,
  Insight,
  LiveActivityCard,
  MovementTrendPoint,
  TrendDirection,
} from "../types";

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededRandom(seed) * items.length) % items.length];
}

export const ACTIVITY_KINDS: ActivityKind[] = [
  "walking",
  "standing",
  "sitting",
  "running",
  "jumping",
  "raise-hand",
  "wave",
  "smile",
  "blink",
  "head-movement",
  "hand-movement",
  "body-movement",
  "idle",
  "unknown",
];

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  "excellent",
  "good",
  "moderate",
  "limited",
  "searching",
];
const SESSION_NAMES = [
  "Morning mobility check",
  "Weekly baseline",
  "Client onboarding",
  "Posture assessment",
  "Standing desk trial",
  "Team demo run",
];

/** Curated default state per activity kind — a plausible live snapshot rather than pure noise. */
const LIVE_DEFAULTS: Record<
  ActivityKind,
  {
    status: ActivityDetectionState;
    confidence: ConfidenceLevel;
    trend: TrendDirection;
    minutesAgo: number;
  }
> = {
  walking: { status: "active", confidence: "excellent", trend: "up", minutesAgo: 6 },
  standing: { status: "detected", confidence: "good", trend: "flat", minutesAgo: 2 },
  sitting: { status: "inactive", confidence: "good", trend: "down", minutesAgo: 45 },
  running: { status: "inactive", confidence: "moderate", trend: "flat", minutesAgo: 180 },
  jumping: { status: "inactive", confidence: "limited", trend: "flat", minutesAgo: 320 },
  "raise-hand": { status: "completed", confidence: "good", trend: "flat", minutesAgo: 4 },
  wave: { status: "detected", confidence: "moderate", trend: "up", minutesAgo: 1 },
  smile: { status: "active", confidence: "good", trend: "up", minutesAgo: 0 },
  blink: { status: "searching", confidence: "limited", trend: "flat", minutesAgo: 0 },
  "head-movement": { status: "detected", confidence: "good", trend: "flat", minutesAgo: 1 },
  "hand-movement": { status: "detected", confidence: "moderate", trend: "up", minutesAgo: 1 },
  "body-movement": { status: "active", confidence: "good", trend: "up", minutesAgo: 0 },
  idle: { status: "inactive", confidence: "good", trend: "down", minutesAgo: 90 },
  unknown: { status: "unavailable", confidence: "offline", trend: "flat", minutesAgo: 600 },
};

const TREND_LABELS: Record<TrendDirection, string> = {
  up: "Trending up this week",
  down: "Trending down this week",
  flat: "Steady this week",
};

function buildLiveActivities(): LiveActivityCard[] {
  const now = Date.now();
  return ACTIVITY_KINDS.map((kind) => {
    const config = LIVE_DEFAULTS[kind];
    const startedAt =
      config.status === "active" || config.status === "detected"
        ? new Date(now - config.minutesAgo * 60_000).toISOString()
        : null;
    const durationSeconds =
      config.status === "active" || config.status === "detected" ? config.minutesAgo * 60 : 0;
    return {
      kind,
      status: config.status,
      confidence: config.status === "unavailable" ? "offline" : config.confidence,
      startedAt,
      durationSeconds,
      lastUpdated: new Date(now - Math.min(config.minutesAgo, 5) * 60_000).toISOString(),
      trend: config.trend,
      trendLabel: TREND_LABELS[config.trend],
    } satisfies LiveActivityCard;
  });
}

const TIMELINE_TEMPLATES: { type: ActivityTimelineEventType; kind: ActivityKind; label: string }[] =
  [
    { type: "activity-started", kind: "walking", label: "Activity tracking started" },
    { type: "walking-started", kind: "walking", label: "Walking started" },
    { type: "standing-started", kind: "standing", label: "Standing started" },
    { type: "running-started", kind: "running", label: "Running started" },
    { type: "activity-changed", kind: "sitting", label: "Switched to sitting" },
    { type: "smile-detected", kind: "smile", label: "Smile detected" },
    { type: "blink-detected", kind: "blink", label: "Blink detected" },
    { type: "hand-raised", kind: "raise-hand", label: "Hand raised" },
    { type: "wave-detected", kind: "wave", label: "Wave detected" },
    { type: "activity-changed", kind: "head-movement", label: "Head movement detected" },
    { type: "activity-finished", kind: "idle", label: "Activity tracking paused" },
  ];

function buildTimeline(count: number): ActivityTimelineEvent[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 11 + 5;
    const template = pick(TIMELINE_TEMPLATES, seed);
    const minutesAgo = Math.round(seededRandom(seed + 1) * 60 * 24 * 3);
    return {
      id: `evt-${i}`,
      type: template.type,
      kind: template.kind,
      timestamp: new Date(now - minutesAgo * 60_000).toISOString(),
      label: template.label,
    } satisfies ActivityTimelineEvent;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function buildHistory(days: number): ActivityHistoryEntry[] {
  const now = Date.now();
  const entries: ActivityHistoryEntry[] = [];
  let counter = 0;
  for (let day = 0; day < days; day++) {
    const entriesToday = 3 + Math.floor(seededRandom(day * 31 + 1) * 5);
    for (let e = 0; e < entriesToday; e++) {
      const seed = day * 97 + e * 13 + 7;
      const kind = pick(ACTIVITY_KINDS, seed);
      const hour = Math.floor(seededRandom(seed + 2) * 14) + 7;
      const minute = Math.floor(seededRandom(seed + 3) * 60);
      const started = new Date(now - day * 86_400_000);
      started.setHours(hour, minute, 0, 0);
      const durationSeconds = 60 + Math.floor(seededRandom(seed + 4) * 2400);
      const ended = new Date(started.getTime() + durationSeconds * 1000);
      counter += 1;
      entries.push({
        id: `hist-${counter}`,
        kind,
        date: started.toISOString().slice(0, 10),
        startedAt: started.toISOString(),
        endedAt: ended.toISOString(),
        durationSeconds,
        confidence: pick(CONFIDENCE_LEVELS, seed + 5),
        sessionId: `SESSION-${2000 + (day % 12)}`,
        sessionName: pick(SESSION_NAMES, seed + 6),
        favorite: seededRandom(seed + 7) > 0.9,
      });
    }
  }
  return entries.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

const LIVE_ACTIVITIES = buildLiveActivities();
const TIMELINE = buildTimeline(48);
const HISTORY = buildHistory(30);

export function fetchLiveActivities(): Promise<LiveActivityCard[]> {
  return delay(LIVE_ACTIVITIES, 500);
}

export function fetchActivityTimeline(): Promise<ActivityTimelineEvent[]> {
  return delay(TIMELINE, 450);
}

export function fetchActivityHistory(): Promise<ActivityHistoryEntry[]> {
  return delay(HISTORY, 550);
}

export function computeActivityStatistics(history: ActivityHistoryEntry[]): ActivityStatistics {
  const totalDurationMinutes = Math.round(
    history.reduce((sum, h) => sum + h.durationSeconds, 0) / 60,
  );
  const countBy = (kind: ActivityKind) => history.filter((h) => h.kind === kind).length;
  const sessionMinutes = new Map<string, number>();
  history.forEach((h) => {
    sessionMinutes.set(
      h.sessionName,
      (sessionMinutes.get(h.sessionName) ?? 0) + h.durationSeconds / 60,
    );
  });
  const mostActiveSession =
    [...sessionMinutes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const qualityRank: ConfidenceLevel[] = [
    "offline",
    "searching",
    "limited",
    "moderate",
    "good",
    "excellent",
  ];
  const avgRank = history.length
    ? history.reduce((sum, h) => sum + qualityRank.indexOf(h.confidence), 0) / history.length
    : 0;

  return {
    totalActivities: history.length,
    currentActivity: LIVE_ACTIVITIES.find((a) => a.status === "active")?.kind ?? null,
    totalDurationMinutes,
    averageDurationMinutes: history.length ? Math.round(totalDurationMinutes / history.length) : 0,
    movementCount:
      countBy("walking") + countBy("running") + countBy("body-movement") + countBy("jumping"),
    smileCount: countBy("smile"),
    blinkCount: countBy("blink"),
    handRaiseCount: countBy("raise-hand"),
    waveCount: countBy("wave"),
    mostActiveSession,
    averageTrackingQuality: qualityRank[Math.round(avgRank)] ?? "good",
  };
}

export function computeActivityDistribution(
  history: ActivityHistoryEntry[],
): ActivityDistributionPoint[] {
  const byKind = new Map<ActivityKind, number>();
  history.forEach((h) => byKind.set(h.kind, (byKind.get(h.kind) ?? 0) + h.durationSeconds / 60));
  return [...byKind.entries()]
    .map(([kind, minutes]) => ({ kind, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function computeMovementTrend(history: ActivityHistoryEntry[]): MovementTrendPoint[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now.getTime() - (6 - i) * 86_400_000);
    const dateStr = day.toISOString().slice(0, 10);
    const count = history.filter(
      (h) =>
        h.date === dateStr && ["walking", "running", "jumping", "body-movement"].includes(h.kind),
    ).length;
    return { label: days[day.getDay() === 0 ? 6 : day.getDay() - 1], count };
  });
}

export function computeDailyActivity(history: ActivityHistoryEntry[]): DailyActivityPoint[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now.getTime() - (6 - i) * 86_400_000);
    const dateStr = day.toISOString().slice(0, 10);
    const minutes = Math.round(
      history.filter((h) => h.date === dateStr).reduce((sum, h) => sum + h.durationSeconds / 60, 0),
    );
    return { label: day.toLocaleDateString("en-US", { weekday: "short" }), minutes };
  });
}

export function computeActivityHeatmap(history: ActivityHistoryEntry[]): ActivityHeatmapPoint[] {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hourLabels = ["6", "8", "10", "12", "14", "16", "18", "20", "22"];
  const points: ActivityHeatmapPoint[] = [];
  for (const day of dayLabels) {
    for (const hour of hourLabels) {
      const count = history.filter((h) => {
        const d = new Date(h.startedAt);
        const dow = dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1];
        const bucket = hourLabels.reduce((closest, h2) =>
          Math.abs(Number(h2) - d.getHours()) < Math.abs(Number(closest) - d.getHours())
            ? h2
            : closest,
        );
        return dow === day && bucket === hour;
      }).length;
      points.push({ day, hour, count });
    }
  }
  return points;
}

const KIND_LABEL: Record<ActivityKind, string> = {
  walking: "Walking",
  standing: "Standing",
  sitting: "Sitting",
  running: "Running",
  jumping: "Jumping",
  "raise-hand": "Raise hand",
  wave: "Wave",
  smile: "Smile",
  blink: "Blink",
  "head-movement": "Head movement",
  "hand-movement": "Hand movement",
  "body-movement": "Body movement",
  idle: "Idle",
  unknown: "Unknown activity",
};

let insightCounter = 0;
function nextInsightId(): string {
  insightCounter += 1;
  return `activity-insight-${insightCounter}`;
}

export function generateActivityInsights(
  history: ActivityHistoryEntry[],
  stats: ActivityStatistics,
): Insight[] {
  if (history.length === 0) return [];
  const distribution = computeActivityDistribution(history);
  const insights: Insight[] = [];

  const top = distribution[0];
  if (top) {
    insights.push({
      id: nextInsightId(),
      tone: "neutral",
      title: `${KIND_LABEL[top.kind]} is the most frequent activity`,
      description: `Logged ${Math.round(top.minutes)} minutes of ${KIND_LABEL[top.kind].toLowerCase()} over the selected period.`,
    });
  }

  const longest = [...history].sort((a, b) => b.durationSeconds - a.durationSeconds)[0];
  if (longest) {
    insights.push({
      id: nextInsightId(),
      tone: "positive",
      title: `Longest activity: ${KIND_LABEL[longest.kind]}`,
      description: `A single ${KIND_LABEL[longest.kind].toLowerCase()} activity ran for ${Math.round(longest.durationSeconds / 60)} minutes in "${longest.sessionName}".`,
    });
  }

  const hourCounts = new Map<number, number>();
  history.forEach((h) => {
    const hour = new Date(h.startedAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  });
  const mostActiveHourEntry = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (mostActiveHourEntry) {
    const [hour] = mostActiveHourEntry;
    const label =
      hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
    insights.push({
      id: nextInsightId(),
      tone: "neutral",
      title: `Most active around ${label}`,
      description: `Activity volume peaks near ${label} based on recent history.`,
    });
  }

  if (stats.averageTrackingQuality === "excellent" || stats.averageTrackingQuality === "good") {
    insights.push({
      id: nextInsightId(),
      tone: "positive",
      title: "Tracking quality is strong",
      description: `Average detection confidence has stayed at "${stats.averageTrackingQuality}" across recent activity.`,
    });
  } else if (
    stats.averageTrackingQuality === "limited" ||
    stats.averageTrackingQuality === "searching"
  ) {
    insights.push({
      id: nextInsightId(),
      tone: "negative",
      title: "Tracking quality could improve",
      description: `Average detection confidence is "${stats.averageTrackingQuality}" — check lighting and camera framing.`,
    });
  }

  return insights;
}

export { KIND_LABEL };
