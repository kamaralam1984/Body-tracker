"use client";

/**
 * Always-visible "professional AI dashboard" — unlike `developer-mode-panel.tsx`
 * (hidden by default, raw coordinates/bounding boxes for the person tuning
 * this app), this is the clean numeric readout for everyone else: FPS,
 * detection speed, processing time, memory, resolution, frame count, and
 * per-model confidence, all from the same real sources already wired up
 * elsewhere (`useCameraContext().stats`, `useTrackingContext().perf`/
 * `modelsStats`).
 *
 * CPU/GPU usage stay explicitly "Not available" — see the note at the
 * bottom — same honesty rule as the rest of this app: no browser API
 * exposes real OS-level utilization percentages, so this never shows one.
 *
 * <LivePerformanceDashboard />
 */

import { useEffect, useState } from "react";
import { Activity, Cpu, Gauge, HardDrive, MonitorPlay, Timer, Video, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCameraContext } from "@/features/camera";
import { useTrackingContext } from "../context/tracking-provider";
import { readJsHeapMb } from "../lib/read-js-heap";

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
}

function StatTile({ icon: Icon, label, value, sub }: StatTileProps) {
  return (
    <div className="border-border-subtle flex flex-col gap-1 rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" strokeWidth={1.75} />
        {label}
      </div>
      <div className="text-foreground text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}

export function LivePerformanceDashboard({ className }: { className?: string }) {
  const { status, stats } = useCameraContext();
  const { perf, modelsStats } = useTrackingContext();
  const [jsHeapMb, setJsHeapMb] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setJsHeapMb(readJsHeapMb()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isLive = status === "running" || status === "paused";
  const resolution = stats.width && stats.height ? `${stats.width}×${stats.height}` : "—";

  const activeModelConfidences = (
    [
      ["Face", modelsStats.face],
      ["Hand", modelsStats.hand],
      ["Pose", modelsStats.pose],
    ] as const
  ).filter(([, stat]) => stat.status === "active");

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Live performance dashboard</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile icon={Video} label="Camera FPS" value={isLive ? stats.fps : "—"} />
          <StatTile
            icon={Zap}
            label="Detection speed"
            value={isLive ? `${round(perf.detectionFps, 1)} fps` : "—"}
          />
          <StatTile
            icon={Timer}
            label="Processing time"
            value={isLive ? `${round(perf.processingTimeMs)} ms` : "—"}
            sub="Latency proxy"
          />
          <StatTile icon={MonitorPlay} label="Resolution" value={resolution} />
          <StatTile
            icon={Activity}
            label="Frame count"
            value={isLive ? stats.frameCount.toLocaleString() : "—"}
          />
          <StatTile
            icon={Gauge}
            label="Dropped frames"
            value={perf.droppedFrames !== null ? perf.droppedFrames : "N/A"}
          />
          <StatTile
            icon={HardDrive}
            label="Memory (JS heap)"
            value={jsHeapMb !== null ? `${round(jsHeapMb)} MB` : "N/A"}
          />
          <StatTile
            icon={Cpu}
            label="CPU cores"
            value={typeof navigator !== "undefined" ? navigator.hardwareConcurrency : "—"}
            sub="Not utilization %"
          />
        </div>

        <div className="border-border-subtle flex flex-col gap-2 border-t pt-3">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Model confidence
          </span>
          {activeModelConfidences.length === 0 ? (
            <p className="text-muted-foreground text-xs">No AI model is active right now.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {activeModelConfidences.map(([label, stat]) => (
                <StatTile
                  key={label}
                  icon={Zap}
                  label={label}
                  value={stat.confidence !== null ? `${round(stat.confidence * 100)}%` : "N/A"}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          CPU/GPU utilization percentages aren&apos;t shown — no browser API exposes real OS-level
          usage numbers, and this app never fabricates one. CPU core count and processing time above
          are the genuine performance signal.
        </p>
      </CardContent>
    </Card>
  );
}
