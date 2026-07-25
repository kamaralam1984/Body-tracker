"use client";

import type { ReactNode } from "react";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Category-share donut chart with an optional centered total/label.
 *
 * @example
 * <ChartDonut
 *   data={[
 *     { name: "Strength", value: 38 },
 *     { name: "Mobility", value: 27 },
 *   ]}
 *   centerLabel={<span className="text-lg font-semibold text-foreground">65</span>}
 * />
 */

const DEFAULT_COLORS = [
  "var(--color-accent-500)",
  "var(--color-neutral-400)",
  "var(--color-neutral-300)",
  "var(--color-neutral-200)",
];

interface ChartDonutDatum {
  [key: string]: string | number;
}

interface ChartDonutProps {
  data: ChartDonutDatum[];
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  centerLabel?: ReactNode;
  className?: string;
  height?: number;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div className="border-border bg-surface-elevated rounded-lg border px-3 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: item.payload.fill }}
        />
        <span className="text-foreground font-medium">{item.name}</span>
        <span className="text-muted-foreground">{item.value}</span>
      </div>
    </div>
  );
}

export function ChartDonut({
  data,
  dataKey = "value",
  nameKey = "name",
  colors = DEFAULT_COLORS,
  centerLabel,
  className,
  height = 260,
}: ChartDonutProps) {
  return (
    <div className={cn("flex w-full flex-col", className)}>
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Tooltip content={ChartTooltip} />
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={1}
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
            >
              {data.map((entry, i) => (
                <Cell
                  key={`${entry[nameKey]}-${i}`}
                  fill={colors[i % colors.length]}
                  stroke="none"
                />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {centerLabel}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {data.map((entry, i) => (
          <div
            key={`${entry[nameKey]}-${i}`}
            className="text-muted-foreground flex items-center gap-1.5 text-xs"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span>{entry[nameKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
