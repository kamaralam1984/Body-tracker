"use client";

/**
 * Per-model control panel — Face/Hand/Pose (the 3 real MediaPipe models this
 * app runs) plus Gesture Recognition (derived from hand-landmarker output,
 * not a separate model) each get ON/OFF, real confidence, real processing
 * time, and the actual model asset in use. Segmentation and Object
 * Detection are listed as genuinely not implemented — no fake toggle, no
 * fabricated numbers, since neither model is wired into this app at all.
 *
 * Every number here is either measured (see tracking-engine.ts's
 * getModelStats()) or explicitly `null`/"Not available" — most visibly,
 * Face never gets a confidence number, because MediaPipe's
 * FaceLandmarkerResult exposes no detection-confidence field at all (only
 * per-expression blendshape scores). That's not a bug to fix; there's
 * nothing real to show.
 *
 * <AIModelManagementPanel />
 */

import { Hand, PersonStanding, ScanFace, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import type { ModelStat, ModelStatus, TrackingMode } from "../types";

const MEDIAPIPE_RUNTIME_VERSION = "Tasks Vision 0.10.35";

const STATUS_BADGE: Record<
  ModelStatus,
  { label: string; variant: "neutral" | "success" | "info" | "danger" }
> = {
  off: { label: "Off", variant: "neutral" },
  initializing: { label: "Initializing…", variant: "info" },
  active: { label: "Active", variant: "success" },
  error: { label: "Error", variant: "danger" },
};

function StatRow({
  label,
  value,
  title,
}: {
  label: string;
  value: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="text-foreground truncate text-xs font-medium tabular-nums" title={title}>
        {value}
      </span>
    </div>
  );
}

interface ModelRowProps {
  label: string;
  icon: LucideIcon;
  stat: ModelStat;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  toggleDisabled?: boolean;
  note?: string;
}

function ModelRow({
  label,
  icon: Icon,
  stat,
  enabled,
  onToggle,
  toggleDisabled,
  note,
}: ModelRowProps) {
  const badge = STATUS_BADGE[stat.status];
  return (
    <div className="border-border-subtle flex flex-col gap-2.5 border-b pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
          <span className="text-foreground text-sm font-medium">{label}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={toggleDisabled}
          aria-label={`Toggle ${label}`}
        />
      </div>
      {note && <p className="text-muted-foreground -mt-1 text-xs">{note}</p>}
      {stat.status === "active" && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2">
            <StatRow
              label="Confidence"
              value={stat.confidence !== null ? `${Math.round(stat.confidence * 100)}%` : "N/A"}
            />
            <StatRow label="Processing" value={`${Math.round(stat.processingTimeMs)} ms`} />
          </div>
          {stat.modelAsset && (
            <StatRow label="Model" value={stat.modelAsset} title={stat.modelAsset} />
          )}
        </div>
      )}
    </div>
  );
}

export function AIModelManagementPanel({ className }: { className?: string }) {
  const { config, modelsStats, toggleMode, setGestureRecognitionEnabled } = useTrackingContext();

  function handleToggle(mode: TrackingMode) {
    toggleMode(mode);
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>AI model management</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ModelRow
          label="Face (Detection + Mesh + Landmarks)"
          icon={ScanFace}
          stat={modelsStats.face}
          enabled={config.modes.has("face")}
          onToggle={() => handleToggle("face")}
          note="MediaPipe runs detection, the 478-point mesh, and landmarks as one model — there's no real way to enable one without the others. Confidence is N/A here because FaceLandmarker's result has no detection-confidence field at all, only per-expression scores."
        />
        <ModelRow
          label="Hand Tracking"
          icon={Hand}
          stat={modelsStats.hand}
          enabled={config.modes.has("hand")}
          onToggle={() => handleToggle("hand")}
        />
        <ModelRow
          label="Gesture Recognition"
          icon={Sparkles}
          stat={{
            status: !config.modes.has("hand")
              ? "off"
              : config.gestureRecognitionEnabled
                ? modelsStats.hand.status
                : "off",
            confidence: null,
            processingTimeMs: 0,
            modelAsset: null,
          }}
          enabled={config.modes.has("hand") && config.gestureRecognitionEnabled}
          onToggle={setGestureRecognitionEnabled}
          toggleDisabled={!config.modes.has("hand")}
          note={
            !config.modes.has("hand")
              ? "Needs Hand Tracking on — gestures are classified from the same hand-landmark output, not a separate model, so there's no confidence/processing-time of its own to show."
              : "Classified from Hand Tracking's landmarks by rule-based geometry (wave, point, pinch, etc.) — not a separate ML model, so it has no confidence or processing time of its own."
          }
        />
        <ModelRow
          label="Pose Tracking"
          icon={PersonStanding}
          stat={modelsStats.pose}
          enabled={config.modes.has("pose")}
          onToggle={() => handleToggle("pose")}
        />

        <div className="border-border-subtle flex flex-col gap-2.5 border-b pb-4 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">Segmentation</span>
              <Badge variant="neutral">Not implemented</Badge>
            </div>
            <Switch checked={false} disabled aria-label="Segmentation (not implemented)" />
          </div>
          <p className="text-muted-foreground -mt-1 text-xs">
            Would need MediaPipe&apos;s ImageSegmenter, a 4th real-time model on top of the 3
            already running — not wired up in this app.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">Object Detection</span>
              <Badge variant="neutral">Not implemented</Badge>
            </div>
            <Switch checked={false} disabled aria-label="Object detection (not implemented)" />
          </div>
          <p className="text-muted-foreground -mt-1 text-xs">
            Would need MediaPipe&apos;s ObjectDetector, a separate real-time model — not wired up in
            this app.
          </p>
        </div>

        <div className="border-border-subtle flex items-center justify-between gap-4 border-t pt-3">
          <Label className="text-xs font-normal">Runtime</Label>
          <span className="text-muted-foreground text-xs">{MEDIAPIPE_RUNTIME_VERSION}</span>
        </div>
      </CardContent>
    </Card>
  );
}
