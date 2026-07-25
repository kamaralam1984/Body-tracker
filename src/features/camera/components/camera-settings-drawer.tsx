"use client";

import type { ChangeEvent } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { DeviceSelector } from "./device-selector";
import { ResolutionSelector } from "./resolution-selector";
import { FpsSelector } from "./fps-selector";
import { CameraAdvancedControls } from "./camera-advanced-controls";
import type { ImageAdjustments } from "../types";

interface CameraSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SECTION_HEADING = "text-muted-foreground text-xs font-semibold tracking-wide uppercase";
const SECTION_DIVIDER = "border-border-subtle flex flex-col gap-3 border-b pb-6";

export function CameraSettingsDrawer({ open, onClose }: CameraSettingsDrawerProps) {
  const { settings, setAutoStart, toggleMirror, resetSettings, setAdjustments } =
    useCameraContext();

  const updateAdjustment =
    (key: keyof ImageAdjustments) => (event: ChangeEvent<HTMLInputElement>) => {
      setAdjustments({ [key]: Number(event.target.value) });
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

        {/* Image adjustments — real CSS filters applied to the preview */}
        <section className={SECTION_DIVIDER}>
          <h3 className={SECTION_HEADING}>Image adjustments</h3>

          <AdjustmentSlider
            label="Brightness"
            value={settings.adjustments.brightness}
            onChange={updateAdjustment("brightness")}
          />
          <AdjustmentSlider
            label="Contrast"
            value={settings.adjustments.contrast}
            onChange={updateAdjustment("contrast")}
          />
          <AdjustmentSlider
            label="Saturation"
            value={settings.adjustments.saturation}
            onChange={updateAdjustment("saturation")}
          />
        </section>

        {/* Zoom / torch / auto-exposure / auto-focus — real hardware controls, feature-detected per device */}
        <section className="flex flex-col gap-4">
          <h3 className={SECTION_HEADING}>Advanced</h3>
          <CameraAdvancedControls />
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
 * Slider primitive in the design system yet. Drives a real CSS `filter()` on
 * the preview `<video>` (see `camera-preview.tsx`), not a placeholder.
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
