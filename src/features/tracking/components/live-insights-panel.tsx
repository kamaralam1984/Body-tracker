"use client";

/**
 * Live, rule-based insights for the current camera session — see
 * `build-live-insights.ts` for the algorithm (mirrors the server's
 * deterministic `analytics-service.ts`, not a model/prediction).
 *
 * <LiveInsightsPanel />
 */

import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import { useLiveInsights } from "../hooks/use-live-insights";
import type { InsightTone } from "../lib/build-live-insights";

const TONE_BADGE: Record<InsightTone, "success" | "warning" | "neutral"> = {
  positive: "success",
  attention: "warning",
  neutral: "neutral",
};

export function LiveInsightsPanel({ className }: { className?: string }) {
  const { live } = useTrackingContext();
  const insights = useLiveInsights(live);

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center gap-2">
        <Lightbulb className="text-muted-foreground size-4" strokeWidth={1.75} />
        <CardTitle>Live insights</CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Keep tracking for a bit — insights appear once there&apos;s enough of a trend to
            compare.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {insights.map((insight) => (
              <div key={insight.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant={TONE_BADGE[insight.tone]}>{insight.tone}</Badge>
                  <p className="text-foreground text-sm font-medium">{insight.title}</p>
                </div>
                <p className="text-muted-foreground text-xs">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
