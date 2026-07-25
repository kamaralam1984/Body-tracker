/**
 * A single business-language observation, rendered as a calm report row —
 * not a chatbot suggestion. Tone drives icon + soft background color only;
 * no sparkle/gradient "AI" treatment.
 */

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight } from "../types";

export interface InsightCardProps {
  insight: Insight;
  className?: string;
}

const TONE_STYLES = {
  positive: {
    icon: CheckCircle2,
    iconClass: "bg-success-bg text-success-600 dark:text-success-500",
  },
  negative: { icon: AlertTriangle, iconClass: "bg-danger-bg text-danger-600 dark:text-danger-500" },
  neutral: { icon: Info, iconClass: "bg-muted text-muted-foreground" },
} as const satisfies Record<Insight["tone"], { icon: typeof Info; iconClass: string }>;

export function InsightCard({ insight, className }: InsightCardProps) {
  const { icon: Icon, iconClass } = TONE_STYLES[insight.tone];

  return (
    <Card className={cn("flex items-start gap-3 p-5", className)}>
      <div
        className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", iconClass)}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-foreground text-sm font-semibold">{insight.title}</p>
        <p className="text-muted-foreground text-sm">{insight.description}</p>
      </div>
    </Card>
  );
}
