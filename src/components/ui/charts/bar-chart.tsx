"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { label: string; value: number }[];
  className?: string;
  height?: number;
}

/** Single-hue magnitude comparison — sequential color job, one bar per category. */
export function BarChart({ data, className, height = 160 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("flex items-end gap-3", className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2.5">
          <div className="flex h-full w-full items-end justify-center">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
              className="bg-accent-500 w-6 max-w-full rounded-t-[4px]"
            />
          </div>
          <span className="text-muted-foreground text-[11px] font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
