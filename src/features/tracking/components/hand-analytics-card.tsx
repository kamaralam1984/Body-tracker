"use client";

/**
 * Live hand readout — only renders once "hand" tracking mode is turned on
 * (off by default, see `TrackingLegend`). Shows left/right visibility, the
 * currently-recognized static gesture, and this session's gesture count.
 *
 * <HandAnalyticsCard />
 */

import { Hand } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";

const GESTURE_LABELS: Record<string, string> = {
  wave: "Wave",
  "raise-hand": "Raised hand",
  point: "Point",
  "thumbs-up": "Thumbs up",
  pinch: "Pinch",
  "open-palm": "Open palm",
  "closed-hand": "Closed hand",
};

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

export function HandAnalyticsCard({ className }: { className?: string }) {
  const { config, live } = useTrackingContext();
  if (!config.modes.has("hand")) return null;

  const handLabel =
    live.handVisible.left && live.handVisible.right
      ? "Both hands"
      : live.handVisible.left
        ? "Left hand"
        : live.handVisible.right
          ? "Right hand"
          : "None";

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center gap-2">
        <Hand className="text-muted-foreground size-4" strokeWidth={1.75} />
        <CardTitle>Hand</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Visible" value={handLabel} />
          <StatItem
            label="Current gesture"
            value={live.currentGesture ? GESTURE_LABELS[live.currentGesture] : "None"}
          />
          <StatItem label="Gesture count" value={live.gestureCountTotal} />
        </div>
      </CardContent>
    </Card>
  );
}
