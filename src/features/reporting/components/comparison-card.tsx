/**
 * A more detailed comparison view than `TrendCard` — shows current vs
 * previous side by side, plus a favorable/unfavorable change badge.
 */

import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatComparisonValue, formatChangeLabel } from "../lib/comparison";
import type { ComparisonResult } from "../types";
import { cn } from "@/lib/utils";

export interface ComparisonCardProps {
  comparison: ComparisonResult;
  className?: string;
}

function badgeVariant(comparison: ComparisonResult): BadgeProps["variant"] {
  if (comparison.direction === "flat") return "neutral";
  const improved = comparison.higherIsBetter
    ? comparison.direction === "up"
    : comparison.direction === "down";
  return improved ? "success" : "danger";
}

export function ComparisonCard({ comparison, className }: ComparisonCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{comparison.label}</p>
        <Badge variant={badgeVariant(comparison)}>{formatChangeLabel(comparison)}</Badge>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-muted-foreground text-lg font-medium tabular-nums">
          {formatComparisonValue(comparison.previous, comparison.unit)}
        </span>
        <ArrowRight className="text-muted-foreground size-3.5 shrink-0" strokeWidth={2} />
        <span className="text-foreground text-lg font-semibold tabular-nums">
          {formatComparisonValue(comparison.current, comparison.unit)}
        </span>
      </div>
    </Card>
  );
}
