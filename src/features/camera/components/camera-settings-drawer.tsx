"use client";

import { useState, type ChangeEvent } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { DeviceSelector } from "./device-selector";
import { ResolutionSelector } from "./resolution-selector";
import { FpsSelector } from "./fps-selector";

interface CameraSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface AdjustmentState {
  brightness: number;
  contrast: number;
  saturation: number;
  noiseReduction: number;
}

const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 50,
  contrast: 50,
  saturation: 50,
  noiseReduction: 50,
};

const SECTION_HEADING = "text-muted-foreground text-xs font-semibold tracking-wide uppercase";
const SECTION_DIVIDER = "border-border-subtle flex flex-col gap-3 border-b pb-6";

export function CameraSettingsDrawer({ open, onClose }: CameraSettingsDrawerProps) {
  const { settings, setAutoStart, toggleMirror, resetSettings } = useCameraContext();
  const [adjustments, setAdjustments] = useState<AdjustmentState>(DEFAULT_ADJUSTMENTS);

  const updateAdjustment =
    (key: keyof AdjustmentState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setAdjustments((prev) => ({ ...prev, [key]: value }));
    };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      title="Camera settings"
      description="Configure your camera input, video quality, and preview behavior."
      footer={
        <Button variant="ghost" size="sm" onClick={resetSettings}>
          Reset to defaults
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Device */}
        <section className={SECTION_DIVIDER}>
          <h3 className={SECTION_HEADING}>Device</h3>
          <DeviceSelector />
        </section>

        {/* Video quality */}
        <section className={SECTION_DIVIDER}>
          <h3 className={SECTION_HEADING}>Video quality</h3>
          <div className="grid grid-cols-2 gap-3">
            <ResolutionSelector />
            <FpsSelector />
          </div>
        </section>

        {/* Preview */}
        <section className={SECTION_DIVIDER}>
          <h3 className={SECTION_HEADING}>Preview</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="mirror-preview">Mirror preview</Label>
              <p className="text-muted-foreground text-xs">
                Flip the preview horizontally, like looking in a mirror.
              </p>
            </div>
            <Switch
              id="mirror-preview"
              checked={settings.mirrored}
              onCheckedChange={() => toggleMirror()}
            />
          </div>
        </section>

        {/* Behavior */}
        <section className={SECTION_DIVIDER}>
          <h3 className={SECTION_HEADING}>Behavior</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="auto-start-camera">Auto-start camera</Label>
              <p className="text-muted-foreground text-xs">
                Start the camera automatically when this page opens.
              </p>
            </div>
            <Switch
              id="auto-start-camera"
              checked={settings.autoStart}
              onCheckedChange={setAutoStart}
            />
          </div>
        </section>

        {/* Image adjustments (placeholder — not wired to real video processing) */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h3 className={SECTION_HEADING}>Image adjustments</h3>
            <p className="text-muted-foreground text-xs">Visual adjustments — coming soon</p>
          </div>

          <AdjustmentSlider
            label="Brightness"
            value={adjustments.brightness}
            onChange={updateAdjustment("brightness")}
          />
          <AdjustmentSlider
            label="Contrast"
            value={adjustments.contrast}
            onChange={updateAdjustment("contrast")}
          />
          <AdjustmentSlider
            label="Saturation"
            value={adjustments.saturation}
            onChange={updateAdjustment("saturation")}
          />
          <AdjustmentSlider
            label="Noise reduction"
            value={adjustments.noiseReduction}
            onChange={updateAdjustment("noiseReduction")}
          />
        </section>
      </div>
    </Drawer>
  );
}

interface AdjustmentSliderProps {
  label: string;
  value: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Minimal inline range slider — local to this file only. There is no shared
 * Slider primitive in the design system yet. Left interactive (not
 * `disabled`) since these are cosmetic placeholders for a future phase, not
 * broken controls; the "coming soon" caption above communicates that intent
 * without the row reading as a dead/greyed-out control.
 */
function AdjustmentSlider({ label, value, onChange }: AdjustmentSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal">{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={onChange}
        aria-label={label}
        className={cn(
          "bg-muted accent-accent h-1.5 w-full appearance-none rounded-full",
          "[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm",
          "[&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
        )}
      />
    </div>
  );
}
