"use client";

/**
 * Recording + data export for the live camera page:
 * - Local-only video recording (`use-session-recording.ts`) — downloads a
 *   `.webm`, never uploaded.
 * - JSON/CSV export of the current session's summary + timeline.
 * - An opt-in, capped (~5fps, 10 min) raw landmark sample log for anyone who
 *   wants per-frame data — off by default since it's a real memory cost.
 *
 * <RecordingExportPanel />
 */

import { useEffect, useRef, useState } from "react";
import { Circle, Download, Mic, Pause, Play, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { downloadJson } from "@/lib/download-file";
import { exportToCsv } from "@/features/reporting/lib/export-engine";
import { useCameraContext } from "@/features/camera";
import { useTrackingContext } from "../context/tracking-provider";
import { MicLevelMeter } from "./mic-level-meter";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const LANDMARK_SAMPLE_INTERVAL_MS = 200; // ~5fps
const MAX_LANDMARK_SAMPLES = 3000; // ~10 minutes at 5fps — a real memory cap, not arbitrary

interface LandmarkSample {
  timestampMs: number;
  headPitch: number | null;
  headYaw: number | null;
  headRoll: number | null;
  handCount: number;
  poseDetected: boolean;
}

export function RecordingExportPanel({ className }: { className?: string }) {
  const { status, videoRef, settings } = useCameraContext();
  const { live, frameRef, recording, renderMode } = useTrackingContext();
  const [landmarkLoggingEnabled, setLandmarkLoggingEnabled] = useState(false);
  const samplesRef = useRef<LandmarkSample[]>([]);
  const [sampleCount, setSampleCount] = useState(0);

  useEffect(() => {
    recording.refreshAudioDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!landmarkLoggingEnabled) return;
    const interval = setInterval(() => {
      const frame = frameRef.current;
      if (!frame) return;
      samplesRef.current.push({
        timestampMs: frame.timestampMs,
        headPitch: frame.face?.headRotation?.pitch ?? null,
        headYaw: frame.face?.headRotation?.yaw ?? null,
        headRoll: frame.face?.headRotation?.roll ?? null,
        handCount: frame.hands.length,
        poseDetected: !!frame.pose,
      });
      if (samplesRef.current.length > MAX_LANDMARK_SAMPLES) {
        samplesRef.current = samplesRef.current.slice(-MAX_LANDMARK_SAMPLES);
      }
      setSampleCount(samplesRef.current.length);
    }, LANDMARK_SAMPLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [landmarkLoggingEnabled, frameRef]);

  const micOptions: SelectOption[] = recording.audioDevices.map((d) => ({
    value: d.deviceId,
    label: d.label,
  }));

  const canRecord = status === "running" || status === "paused";

  function handleToggleRecording() {
    if (recording.isRecording) {
      recording.stopRecording();
    } else if (videoRef.current) {
      void recording.startRecording({
        videoEl: videoRef.current,
        frameRef,
        renderMode,
        mirrored: settings.mirrored,
      });
    }
  }

  // `R` starts/stops recording — same self-contained shortcut pattern as
  // camera-toolbar.tsx's Space/M/S/C/G, scoped to whichever component owns
  // the relevant state so shortcuts don't require lifting hooks across
  // features just to share a keydown listener.
  useEffect(() => {
    function isTypingTarget(el: Element | null): boolean {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return;
      if (event.code === "KeyR" && canRecord) handleToggleRecording();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRecord, recording.isRecording, renderMode, settings.mirrored]);

  function handleExportSessionJson() {
    downloadJson(`camera-session-${Date.now()}.json`, {
      exportedAt: new Date().toISOString(),
      sessionStartedAt: live.sessionStartedAt,
      elapsedSeconds: live.elapsedSeconds,
      blinkCountTotal: live.blinkCountTotal,
      gestureCountTotal: live.gestureCountTotal,
      exerciseSetCountTotal: live.exerciseSetCountTotal,
      attentionAvg: live.attentionAvg,
      attentionHigh: live.attentionHigh,
      attentionLow: live.attentionLow,
      caloriesEstimateLive: live.caloriesEstimateLive,
      timeline: live.timeline,
    });
  }

  function handleExportTimelineCsv() {
    exportToCsv(
      `camera-session-timeline-${Date.now()}`,
      live.timeline.map((entry) => ({ time: entry.time, event: entry.label })),
    );
  }

  function handleExportLandmarksJson() {
    downloadJson(`camera-session-landmarks-${Date.now()}.json`, samplesRef.current);
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Recording &amp; export</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mic className="text-muted-foreground size-4" strokeWidth={1.75} />
              <Label htmlFor="mic-toggle">Include microphone</Label>
            </div>
            <Switch
              id="mic-toggle"
              checked={recording.micEnabled}
              onCheckedChange={recording.setMicEnabled}
              disabled={recording.isRecording}
            />
          </div>
          {recording.micEnabled && micOptions.length > 0 && (
            <Select
              options={micOptions}
              value={recording.selectedMicId}
              onValueChange={recording.setSelectedMicId}
              placeholder="Default microphone"
            />
          )}
          {recording.micEnabled && (
            <div className="flex flex-col gap-2">
              {recording.micTrack && <MicLevelMeter track={recording.micTrack} />}
              <div className="grid grid-cols-3 gap-2">
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={recording.audioAdjustments.noiseSuppression}
                    onChange={(e) =>
                      recording.setAudioAdjustments({ noiseSuppression: e.target.checked })
                    }
                  />
                  Noise suppression
                </label>
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={recording.audioAdjustments.echoCancellation}
                    onChange={(e) =>
                      recording.setAudioAdjustments({ echoCancellation: e.target.checked })
                    }
                  />
                  Echo cancellation
                </label>
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={recording.audioAdjustments.autoGainControl}
                    onChange={(e) =>
                      recording.setAudioAdjustments({ autoGainControl: e.target.checked })
                    }
                  />
                  Gain control
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant={recording.isRecording ? "danger" : "outline"}
              disabled={!canRecord}
              onClick={handleToggleRecording}
              className="flex-1"
            >
              {recording.isRecording ? (
                <>
                  <Square className="fill-current" /> Stop
                </>
              ) : (
                <>
                  <Circle className="fill-current" /> Start recording
                </>
              )}
            </Button>
            {recording.isRecording && (
              <Button
                type="button"
                variant="outline"
                onClick={recording.isPaused ? recording.resumeRecording : recording.pauseRecording}
              >
                {recording.isPaused ? <Play /> : <Pause />}
              </Button>
            )}
          </div>

          {recording.isRecording && (
            <div className="bg-muted flex flex-col gap-1.5 rounded-md px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-danger flex items-center gap-1.5 font-medium">
                  <span className="bg-danger size-2 animate-pulse rounded-full" />
                  {recording.isPaused ? "Paused" : "Recording"}{" "}
                  {formatDuration(recording.stats.elapsedSeconds)}
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(recording.stats.bytesRecorded)}
                </span>
                {recording.stats.estimatedRemainingBytes !== null && (
                  <span className="text-muted-foreground">
                    {formatBytes(recording.stats.estimatedRemainingBytes)} free
                  </span>
                )}
              </div>
              <div className="text-muted-foreground flex items-center justify-between gap-4">
                <span className="truncate">{recording.stats.mimeType ?? "—"}</span>
                <span>
                  {recording.stats.elapsedSeconds > 0
                    ? `${Math.round((recording.stats.bytesRecorded * 8) / recording.stats.elapsedSeconds / 1000)} kbps`
                    : "— kbps"}
                </span>
              </div>
            </div>
          )}

          {recording.error && <p className="text-danger text-xs">{recording.error}</p>}
          <p className="text-muted-foreground text-xs">
            Saved locally as a .webm file — never uploaded anywhere.
          </p>
        </div>

        <div className="border-border-subtle flex flex-col gap-2 border-t pt-4">
          <Button type="button" variant="outline" size="sm" onClick={handleExportSessionJson}>
            <Download /> Export session (JSON)
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleExportTimelineCsv}>
            <Download /> Export timeline (CSV)
          </Button>
        </div>

        <div className="border-border-subtle flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="landmark-logging">Record raw landmark samples</Label>
            <Switch
              id="landmark-logging"
              checked={landmarkLoggingEnabled}
              onCheckedChange={setLandmarkLoggingEnabled}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Sampled at ~5/sec, capped at {MAX_LANDMARK_SAMPLES.toLocaleString()} samples (~10 min)
            to keep memory bounded.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={sampleCount === 0}
            onClick={handleExportLandmarksJson}
          >
            <Download /> Export landmarks ({sampleCount} samples)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
