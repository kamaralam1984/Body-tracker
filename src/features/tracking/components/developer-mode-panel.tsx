"use client";

/**
 * Hidden-by-default debug panel — FPS graph, real per-frame processing
 * time, raw landmark coordinates, bounding boxes, and a recent-events log.
 * For the person building/tuning this app, not the end user; stays
 * collapsed until explicitly toggled, so it never clutters the normal UI.
 *
 * <DeveloperModePanel />
 */

import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkline } from "@/components/ui/charts/sparkline";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import { allSubjects, boundsOf } from "../lib/render/render-modes";
import { readJsHeapMb } from "../lib/read-js-heap";
import type { TrackingFrame } from "../types";

const FPS_HISTORY_LENGTH = 30;
const FRAME_POLL_MS = 500;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function DeveloperModePanel({ className }: { className?: string }) {
  const { frameRef, perf, live, renderPerfRef } = useTrackingContext();
  const [enabled, setEnabled] = useState(false);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const [polledFrame, setPolledFrame] = useState<TrackingFrame | null>(null);
  const [jsHeapMb, setJsHeapMb] = useState<number | null>(null);
  const [renderTimeMs, setRenderTimeMs] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    // Accumulating a rolling window from an external, already-throttled
    // value (perf.detectionFps updates at most every 500ms) — not
    // synchronizing derived render state, so this is the legitimate
    // exception to the rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFpsHistory((prev) => [...prev, perf.detectionFps].slice(-FPS_HISTORY_LENGTH));
  }, [enabled, perf.detectionFps]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setPolledFrame(frameRef.current);
      setJsHeapMb(readJsHeapMb());
      setRenderTimeMs(renderPerfRef.current.renderTimeMs);
    }, FRAME_POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, frameRef, renderPerfRef]);

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="text-muted-foreground size-4" strokeWidth={1.75} />
          <CardTitle>Developer mode</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="developer-mode-toggle" className="text-xs font-normal">
            {enabled ? "On" : "Off"}
          </Label>
          <Switch id="developer-mode-toggle" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                Processing time
              </span>
              <span className="text-foreground text-sm font-medium">
                {round(perf.processingTimeMs)} ms/frame
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                Detection FPS
              </span>
              <span className="text-foreground text-sm font-medium">
                {round(perf.detectionFps)}
              </span>
            </div>
            {fpsHistory.length > 1 && <Sparkline data={fpsHistory} className="h-8 w-24" />}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                Rendering time
              </span>
              <span className="text-foreground text-sm font-medium">
                {round(renderTimeMs)} ms/frame
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                Dropped frames
              </span>
              <span className="text-foreground text-sm font-medium">
                {perf.droppedFrames !== null ? perf.droppedFrames : "Not available in this browser"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                CPU cores
              </span>
              <span className="text-foreground text-sm font-medium">
                {navigator.hardwareConcurrency ?? "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                JS memory
              </span>
              <span className="text-foreground text-sm font-medium">
                {jsHeapMb !== null ? `${round(jsHeapMb)} MB` : "Not available in this browser"}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground -mt-3 text-xs">
            No web API exposes real CPU/GPU utilization percentages — this app never fabricates one.
            Processing time and detection FPS above are the genuine performance signal.
          </p>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Bounding boxes
            </span>
            {polledFrame && allSubjects(polledFrame).length > 0 ? (
              <div className="flex flex-col gap-1 font-mono text-xs">
                {allSubjects(polledFrame).map((subject) => {
                  const bounds = boundsOf(subject.points);
                  if (!bounds) return null;
                  return (
                    <div key={subject.label} className="text-muted-foreground">
                      {subject.label}: x={round(bounds.x, 3)} y={round(bounds.y, 3)} w=
                      {round(bounds.w, 3)} h={round(bounds.h, 3)} ({subject.points.length} pts)
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Nothing detected this frame.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Raw coordinates (first 3 points)
            </span>
            {polledFrame && allSubjects(polledFrame).length > 0 ? (
              <div className="flex flex-col gap-1 font-mono text-xs">
                {allSubjects(polledFrame).map((subject) => (
                  <div key={subject.label} className="text-muted-foreground">
                    {subject.label}:{" "}
                    {subject.points
                      .slice(0, 3)
                      .map(
                        (p, i) =>
                          `[${i}] (${round(p.x, 3)}, ${round(p.y, 3)}${p.z !== undefined ? `, ${round(p.z, 3)}` : ""})`,
                      )
                      .join(" ")}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Nothing detected this frame.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Recent events
            </span>
            {live.timeline.length === 0 ? (
              <p className="text-muted-foreground text-xs">No events logged yet this session.</p>
            ) : (
              <div className="flex flex-col gap-0.5 font-mono text-xs">
                {live.timeline.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="text-muted-foreground">
                    {new Date(entry.time).toLocaleTimeString("en-US", { hour12: false })} —{" "}
                    {entry.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
