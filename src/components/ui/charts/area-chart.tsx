"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AreaChartProps {
  data: number[];
  labels?: string[];
  className?: string;
  height?: number;
}

/** Trend-over-time for a single series — sequential color job, area wash at ~10% opacity. */
export function AreaChart({ data, labels, className, height = 220 }: AreaChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((v, i) => [i * stepX, h - ((v - min) / range) * h] as const);
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full overflow-visible"
        role="img"
        aria-label="Trend chart"
      >
        <motion.path
          d={areaPath}
          fill="var(--color-accent)"
          opacity={0.1}
          stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {labels && (
        <div className="text-muted-foreground flex justify-between text-[11px]">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
