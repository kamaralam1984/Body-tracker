"use client";

/**
 * Live list of currently-detected objects — only renders once "Object
 * Detection" is turned on in the AI Model Management panel (off by
 * default). Every entry is real: MediaPipe's ObjectDetector genuinely
 * returns a category name + confidence score per detection, unlike
 * Face/Hand/Pose which carry no per-detection score at all.
 *
 * <ObjectDetectionCard />
 */

import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import type { DetectedObject } from "../types";

// `frameRef` is a plain ref updated at detection rate (up to ~30fps) — it
// must be polled into React state at a bounded rate to actually re-render,
// same pattern as developer-mode-panel.tsx.
const POLL_MS = 500;

export function ObjectDetectionCard({ className }: { className?: string }) {
  const { config, frameRef } = useTrackingContext();
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const enabled = config.modes.has("object-detection");

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setObjects(frameRef.current?.objects ?? []);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, frameRef]);

  if (!enabled) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center gap-2">
        <Boxes className="text-muted-foreground size-4" strokeWidth={1.75} />
        <CardTitle>Detected objects</CardTitle>
      </CardHeader>
      <CardContent>
        {objects.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nothing detected this frame.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {objects.map((object, index) => (
              <div
                key={`${object.categoryName}-${index}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-foreground text-sm">{object.categoryName}</span>
                <Badge variant="accent">{Math.round(object.score * 100)}%</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
