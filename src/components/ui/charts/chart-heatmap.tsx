"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Two-dimensional magnitude grid (e.g. workouts logged per hour x weekday)
 * using a sequential single-hue ramp, with a hover tooltip and legend strip.
 *
 * @example
 * <ChartHeatmap
 *   data={[{ hour: "9", day: "Mon", count: 4 }, { hour: "10", day: "Mon", count: 12 }]}
 *   xLabels={["9", "10", "11"]}
 *   yLabels={["Mon", "Tue"]}
 *   xKey="hour"
 *   yKey="day"
 *   valueKey="count"
 * />
 */

const HEAT_STEPS = [
  "var(--color-accent-100)",
  "var(--color-accent-200)",
  "var(--color-accent-400)",
  "var(--color-accent-500)",
  "var(--color-accent-700)",
  "var(--color-accent-900)",
];

interface ChartHeatmapProps {
  data: Record<string, string | number>[];
  xLabels: string[];
  yLabels: string[];
  xKey: string;
  yKey: string;
  valueKey: string;
  className?: string;
  height?: number;
}

interface HoveredCell {
  x: string;
  y: string;
  value: number;
  left: number;
  top: number;
}

function getStepColor(value: number, min: number, max: number): string {
  if (max <= min) return HEAT_STEPS[0];
  const normalized = ((value - min) / (max - min)) * 100;
  const clamped = Math.min(100, Math.max(0, normalized));
  const index = Math.min(HEAT_STEPS.length - 1, Math.floor((clamped / 100) * HEAT_STEPS.length));
  return HEAT_STEPS[index];
}

export function ChartHeatmap({
  data,
  xLabels,
  yLabels,
  xKey,
  yKey,
  valueKey,
  className,
  height = 260,
}: ChartHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoveredCell | null>(null);

  const lookup = new Map<string, number>();
  let min = Infinity;
  let max = -Infinity;
  for (const datum of data) {
    const x = String(datum[xKey]);
    const y = String(datum[yKey]);
    const value = Number(datum[valueKey]) || 0;
    lookup.set(`${y}|${x}`, value);
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;

  const rowHeight = Math.max(18, Math.floor(height / (yLabels.length + 1)));

  function showTooltip(
    e: React.MouseEvent | React.FocusEvent,
    x: string,
    y: string,
    value: number,
  ) {
    const container = containerRef.current;
    const target = e.currentTarget as HTMLElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const cellRect = target.getBoundingClientRect();
    setHovered({
      x,
      y,
      value,
      left: cellRect.left - containerRect.left + cellRect.width / 2,
      top: cellRect.top - containerRect.top,
    });
  }

  function hideTooltip() {
    setHovered(null);
  }

  return (
    <div className={cn("w-full", className)}>
      <div ref={containerRef} className="relative overflow-x-auto">
        <div
          role="grid"
          aria-label="Heatmap"
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `auto repeat(${xLabels.length}, minmax(${rowHeight}px, 1fr))`,
          }}
        >
          <div />
          {xLabels.map((colLabel) => (
            <div
              key={`col-${colLabel}`}
              className="text-muted-foreground pb-1 text-center text-[10px] font-medium"
            >
              {colLabel}
            </div>
          ))}

          {yLabels.flatMap((rowLabel) => [
            <div
              key={`label-${rowLabel}`}
              className="text-muted-foreground flex items-center pr-2 text-[10px] font-medium"
              style={{ height: rowHeight }}
            >
              {rowLabel}
            </div>,
            ...xLabels.map((colLabel) => {
              const value = lookup.get(`${rowLabel}|${colLabel}`) ?? 0;
              return (
                <div
                  key={`cell-${rowLabel}-${colLabel}`}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${rowLabel}, ${colLabel}: ${value}`}
                  className="focus-visible:ring-accent-500 cursor-default rounded-sm transition-colors outline-none focus-visible:ring-2"
                  style={{ backgroundColor: getStepColor(value, min, max), height: rowHeight }}
                  onMouseEnter={(e) => showTooltip(e, colLabel, rowLabel, value)}
                  onMouseLeave={hideTooltip}
                  onFocus={(e) => showTooltip(e, colLabel, rowLabel, value)}
                  onBlur={hideTooltip}
                />
              );
            }),
          ])}
        </div>

        {hovered && (
          <div
            className="border-border bg-surface-elevated pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border px-3 py-2 text-sm whitespace-nowrap shadow-lg"
            style={{ left: hovered.left, top: hovered.top - 6 }}
          >
            <p className="text-foreground font-medium">
              {hovered.y} · {hovered.x}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: getStepColor(hovered.value, min, max) }}
              />
              <span className="text-muted-foreground">Value</span>
              <span className="text-foreground font-medium">{hovered.value}</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-muted-foreground mt-3 flex items-center justify-end gap-1.5 text-xs">
        <span>Less</span>
        {HEAT_STEPS.map((color) => (
          <span
            key={color}
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
