import type { ComparisonResult } from "../types";

export function formatComparisonValue(value: number, unit: ComparisonResult["unit"]): string {
  switch (unit) {
    case "percent":
      return `${value}%`;
    case "minutes":
      return `${value} min`;
    default:
      return String(value);
  }
}

export function formatChangeLabel(comparison: ComparisonResult): string {
  const sign = comparison.changePercent > 0 ? "+" : "";
  return `${sign}${comparison.changePercent}%`;
}

/** A single 0-100 score summarizing several comparisons, weighted equally. */
export function computePerformanceScore(comparisons: ComparisonResult[]): number {
  if (comparisons.length === 0) return 0;
  const scores = comparisons.map((c) => {
    const favorable = c.higherIsBetter ? c.changePercent : -c.changePercent;
    return Math.min(100, Math.max(40, 70 + favorable * 1.5));
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
