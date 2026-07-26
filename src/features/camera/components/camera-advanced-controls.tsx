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

type NumericConstraintField = "zoom" | "colorTemperature" | "iso" | "exposureTime";

/** Generic feature-detected numeric slider — reused for zoom/white-balance-temperature/ISO/shutter-speed, which all follow the exact same `getCapabilities()` `{min,max,step}` shape. */
function NumericConstraintSlider({
  label,
  field,
  unit,
  capability,
}: {
  label: string;
  field: NumericConstraintField;
  unit: string;
  capability: { min: number; max: number; step: number };
}) {
  const { applyTrackConstraints } = useCameraContext();
  const [value, setValue] = useState<number | null>(null);
  const current = value ?? capability.min;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    setValue(next);
    void applyTrackConstraints({ [field]: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal">{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {current.toFixed(field === "zoom" ? 1 : 0)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={capability.min}
        max={capability.max}
        step={capability.step || 1}
        value={current}
        onChange={handleChange}
        aria-label={label}
        className={cn(
          "bg-muted accent-accent h-1.5 w-full appearance-none rounded-full",
          "[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm",
        )}
      />
    </div>
  );
}

function ZoomControl() {
  const { capabilities } = useCameraContext();
  if (!capabilities?.zoom) return null;
  return (
    <NumericConstraintSlider label="Zoom" field="zoom" unit="×" capability={capabilities.zoom} />
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

function WhiteBalanceControl() {
  const { capabilities, applyTrackConstraints } = useCameraContext();
  const [auto, setAuto] = useState(true);
  const modes = capabilities?.whiteBalanceMode;
  const canToggle = !!modes?.includes("continuous") && !!modes?.includes("manual");
  const temperature = capabilities?.colorTemperature;

  if (!canToggle && !temperature) return null;

  return (
    <div className="flex flex-col gap-3">
      {canToggle && (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="auto-white-balance">Auto white balance</Label>
          <Switch
            id="auto-white-balance"
            checked={auto}
            onCheckedChange={(checked) => {
              setAuto(checked);
              void applyTrackConstraints({ whiteBalanceMode: checked ? "continuous" : "manual" });
            }}
          />
        </div>
      )}
      {temperature && !auto && (
        <NumericConstraintSlider
          label="Color temperature"
          field="colorTemperature"
          unit="K"
          capability={temperature}
        />
      )}
    </div>
  );
}

function IsoControl() {
  const { capabilities } = useCameraContext();
  if (!capabilities?.iso) return null;
  return <NumericConstraintSlider label="ISO" field="iso" unit="" capability={capabilities.iso} />;
}

function ShutterSpeedControl() {
  const { capabilities } = useCameraContext();
  if (!capabilities?.exposureTime) return null;
  return (
    <NumericConstraintSlider
      label="Shutter speed"
      field="exposureTime"
      unit=""
      capability={capabilities.exposureTime}
    />
  );
}

export function CameraAdvancedControls() {
  const { capabilities } = useCameraContext();
  const hasAny =
    !!capabilities?.zoom ||
    !!capabilities?.torch ||
    !!capabilities?.exposureMode?.length ||
    !!capabilities?.focusMode?.length ||
    !!capabilities?.whiteBalanceMode?.length ||
    !!capabilities?.colorTemperature ||
    !!capabilities?.iso ||
    !!capabilities?.exposureTime;

  if (!capabilities || !hasAny) {
    return (
      <p className="text-muted-foreground text-xs">
        This camera doesn&apos;t report support for zoom, torch, exposure/focus, white balance, ISO,
        or shutter speed control — most webcams don&apos;t expose these to the browser, so this is
        the honest result, not a bug.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ZoomControl />
      <TorchControl />
      <AutoModeControl label="Auto exposure" field="exposureMode" htmlId="auto-exposure" />
      <AutoModeControl label="Auto focus" field="focusMode" htmlId="auto-focus" />
      <WhiteBalanceControl />
      <IsoControl />
      <ShutterSpeedControl />
    </div>
  );
}
