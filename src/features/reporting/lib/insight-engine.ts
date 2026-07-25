/**
 * Rule-based (deterministic, not AI) insight generation. Each function takes
 * already-computed aggregate metrics and turns them into short, human
 * business-language observations — never raw tracking internals.
 */

import type { ComparisonResult, DetectionRates, Insight, MovementFrequencyPoint } from "../types";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

const ACTIVITY_LABEL: Record<string, string> = {
  standing: "Standing",
  walking: "Walking",
  running: "Running",
  sitting: "Sitting",
  idle: "Idle",
};

const DETECTION_LABEL: Record<keyof DetectionRates, string> = {
  face: "Face",
  hand: "Hand",
  pose: "Pose",
};

/** One insight per comparison whose swing is large enough to be worth surfacing. */
export function generateComparisonInsights(comparisons: ComparisonResult[]): Insight[] {
  return comparisons
    .filter((c) => Math.abs(c.changePercent) >= 3)
    .map((c) => {
      const improved = c.higherIsBetter ? c.direction === "up" : c.direction === "down";
      const tone: Insight["tone"] =
        c.direction === "flat" ? "neutral" : improved ? "positive" : "negative";
      const verb =
        c.direction === "up" ? "increased" : c.direction === "down" ? "decreased" : "stayed steady";
      return {
        id: nextId("cmp"),
        tone,
        title: `${c.label} ${verb}`,
        description: `${c.label} ${verb} ${Math.abs(c.changePercent)}% compared to the previous period.`,
      };
    });
}

export function generateDetectionInsight(rates: DetectionRates): Insight | null {
  const entries = Object.entries(rates) as [keyof DetectionRates, number][];
  const weakest = [...entries].sort((a, b) => a[1] - b[1])[0];
  if (!weakest || weakest[1] >= 85) return null;
  const label = DETECTION_LABEL[weakest[0]];
  return {
    id: nextId("det"),
    tone: "neutral",
    title: `${label} detection has room to improve`,
    description: `${label} tracking was the least consistent this period — better lighting or camera placement can help.`,
  };
}

export function generateMovementInsight(frequency: MovementFrequencyPoint[]): Insight | null {
  if (frequency.length === 0) return null;
  const top = [...frequency].sort((a, b) => b.occurrences - a.occurrences)[0];
  const label = ACTIVITY_LABEL[top.activity] ?? top.activity;
  return {
    id: nextId("mov"),
    tone: "neutral",
    title: `${label} is your most common activity`,
    description: `${label} accounted for the largest share of tracked time this period.`,
  };
}

export function generateBestSlotInsight(
  points: { label: string; minutes: number }[],
  subject: "hour" | "day",
): Insight | null {
  if (points.length === 0) return null;
  const best = [...points].sort((a, b) => b.minutes - a.minutes)[0];
  return {
    id: nextId(subject),
    tone: "neutral",
    title: `${best.label} is your most active ${subject}`,
    description: `Tracked activity peaks around ${best.label} — a good time to schedule focused sessions.`,
  };
}

export function combineInsights(...groups: (Insight | Insight[] | null)[]): Insight[] {
  return groups.flatMap((group) => (group ? (Array.isArray(group) ? group : [group]) : []));
}
