import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./card";
import { Sparkline } from "./charts/sparkline";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down"; positive?: boolean };
  trend?: number[];
  icon?: LucideIcon;
  className?: string;
}

export function StatTile({ label, value, delta, trend, icon: Icon, className }: StatTileProps) {
  const positive = delta ? (delta.positive ?? delta.direction === "up") : true;

  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        {Icon && (
          <div className="bg-muted flex size-8 items-center justify-center rounded-md">
            <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-foreground text-[1.75rem] leading-none font-semibold tracking-tight">
            {value}
          </p>
          {delta && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                positive
                  ? "text-success-600 dark:text-success-500"
                  : "text-danger-600 dark:text-danger-500",
              )}
            >
              {delta.direction === "up" ? (
                <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
              ) : (
                <ArrowDownRight className="size-3.5" strokeWidth={2.25} />
              )}
              <span>{delta.value}</span>
              <span className="text-muted-foreground font-normal">vs last period</span>
            </div>
          )}
        </div>
        {trend && <Sparkline data={trend} className="mb-0.5" />}
      </div>
    </Card>
  );
}
