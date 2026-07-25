"use client";

/**
 * Zoom / torch / auto-exposure / auto-focus — real hardware controls via
 * `MediaStreamTrack.applyConstraints()`, feature-detected from
 * `track.getCapabilities()` (`useCameraContext().capabilities`). Renders
 * nothing for a control the active device doesn't actually report support
 * for — most desktop webcams support none of these; that's the honest
 * result, not a bug to work around with a fake always-on slider.
 *
 * <CameraAdvancedControls />
 */

import { useState, type ChangeEvent } from "react";
import { Flashlight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

function ZoomControl() {
  const { capabilities, applyTrackConstraints } = useCameraContext();
  const zoom = capabilities?.zoom;
  const [value, setValue] = useState<number | null>(null);
  if (!zoom) return null;

  const current = value ?? zoom.min;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    setValue(next);
    void applyTrackConstraints({ zoom: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal">Zoom</Label>
        <span className="text-muted-foreground text-xs tabular-nums">{current.toFixed(1)}×</span>
      </div>
      <input
        type="range"
        min={zoom.min}
        max={zoom.max}
        step={zoom.step || 0.1}
        value={current}
        onChange={handleChange}
        aria-label="Zoom"
        className={cn(
          "bg-muted accent-accent h-1.5 w-full appearance-none rounded-full",
          "[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm",
        )}
      />
    </div>
  );
}

function TorchControl() {
  const { capabilities, applyTrackConstraints } = useCameraContext();
  const [on, setOn] = useState(false);
  if (!capabilities?.torch) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Flashlight className="text-muted-foreground size-4" strokeWidth={1.75} />
        <Label htmlFor="torch-toggle">Torch</Label>
      </div>
      <Switch
        id="torch-toggle"
        checked={on}
        onCheckedChange={(checked) => {
          setOn(checked);
          void applyTrackConstraints({ torch: checked });
        }}
      />
    </div>
  );
}

function AutoModeControl({
  label,
  field,
  htmlId,
}: {
  label: string;
  field: "exposureMode" | "focusMode";
  htmlId: string;
}) {
  const { capabilities, applyTrackConstraints } = useCameraContext();
  const [auto, setAuto] = useState(true);
  const modes = capabilities?.[field];
  if (!modes || !modes.includes("continuous") || !modes.includes("manual")) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={htmlId}>{label}</Label>
      <Switch
        id={htmlId}
        checked={auto}
        onCheckedChange={(checked) => {
          setAuto(checked);
          void applyTrackConstraints({ [field]: checked ? "continuous" : "manual" });
        }}
      />
    </div>
  );
}

export function CameraAdvancedControls() {
  const { capabilities } = useCameraContext();
  const hasAny =
    !!capabilities?.zoom ||
    !!capabilities?.torch ||
    !!capabilities?.exposureMode?.length ||
    !!capabilities?.focusMode?.length;

  if (!capabilities || !hasAny) {
    return (
      <p className="text-muted-foreground text-xs">
        This camera doesn&apos;t report support for zoom, torch, or exposure/focus control.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ZoomControl />
      <TorchControl />
      <AutoModeControl label="Auto exposure" field="exposureMode" htmlId="auto-exposure" />
      <AutoModeControl label="Auto focus" field="focusMode" htmlId="auto-focus" />
    </div>
  );
}
