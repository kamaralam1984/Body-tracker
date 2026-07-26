"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { useCameraPresets } from "../hooks/use-camera-presets";
import { DeviceSelector } from "./device-selector";
import { ResolutionSelector } from "./resolution-selector";
import { FpsSelector } from "./fps-selector";
import { CameraAdvancedControls } from "./camera-advanced-controls";
import { AspectRatioSelector } from "./aspect-ratio-selector";
import type { CameraSettingsState, GridOverlayMode, ImageAdjustments } from "../types";

const GRID_OPTIONS: SelectOption[] = [
  { value: "off", label: "Off" },
  { value: "thirds", label: "Rule of thirds" },
  { value: "crosshair", label: "Center crosshair" },
  { value: "golden", label: "Golden ratio" },
  { value: "safe-margins", label: "Safe margins" },
];

interface CameraSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SECTION_HEADING = "text-muted-foreground text-xs font-semibold tracking-wide uppercase";
const SECTION_DIVIDER = "border-border-subtle flex flex-col gap-3 border-b pb-6";

export function CameraSettingsDrawer({ open, onClose }: CameraSettingsDrawerProps) {
  const {
    settings,
    setAutoStart,
    toggleMirror,
    resetSettings,
    setAdjustments,
    setAspectRatio,
    setGridOverlay,
    setLowLightBoost,
    switchDevice,
    setResolution,
    setFrameRate,
  } = useCameraContext();
  const presets = useCameraPresets();
  const [presetName, setPresetName] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const updateAdjustment =
    (key: keyof ImageAdjustments) => (event: ChangeEvent<HTMLInputElement>) => {
      setAdjustments({ [key]: Number(event.target.value) });
    };

  async function handleApplyPreset(preset: CameraSettingsState) {
    if (preset.deviceId) await switchDevice(preset.deviceId);
    await setResolution(preset.resolution);
    await setFrameRate(preset.frameRate);
    setAdjustments(preset.adjustments);
    setAspectRatio(preset.aspectRatio);
    setGridOverlay(preset.gridOverlay);
    setLowLightBoost(preset.lowLightBoost);
    setAutoStart(preset.autoStart);
    if (preset.mirrored !== settings.mirrored) toggleMirror();
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void presets.importPreset(file);
    event.target.value = "";
  }

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

        {/* Framing */}
        <section className={SECTION_DIVIDER}>
          <h3 className={SECTION_HEADING}>Framing</h3>
          <div className="grid grid-cols-2 gap-3">
            <AspectRatioSelector />
            <div className="flex flex-col gap-1.5">
              <Label>Grid overlay</Label>
              <Select
                options={GRID_OPTIONS}
                value={settings.gridOverlay}
                onValueChange={(value) => setGridOverlay(value as GridOverlayMode)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="low-light-boost">Low-light boost</Label>
              <p className="text-muted-foreground text-xs">
                A brightness/contrast boost on top of your manual sliders — not a learned model.
              </p>
            </div>
            <Switch
              id="low-light-boost"
              checked={settings.lowLightBoost}
              onCheckedChange={setLowLightBoost}
            />
          </div>
        </section>

        {/* Zoom / torch / auto-exposure / auto-focus / white balance / ISO / shutter — real hardware controls, feature-detected per device */}
        <section className={SECTION_DIVIDER}>
          <h3 className={SECTION_HEADING}>Advanced</h3>
          <CameraAdvancedControls />
        </section>

        {/* Presets — save/reload full settings, export/import as JSON */}
        <section className="flex flex-col gap-3">
          <h3 className={SECTION_HEADING}>Presets</h3>

          <div className="flex gap-2">
            <Input
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!presetName.trim()}
              onClick={() => {
                presets.savePreset(presetName.trim(), settings);
                setPresetName("");
              }}
            >
              Save
            </Button>
          </div>

          {presets.presets.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {presets.presets.map((preset) => (
                <div
                  key={preset.id}
                  className="border-border flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
                >
                  <span className="text-foreground truncate text-sm">{preset.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => void handleApplyPreset(preset.settings)}
                    >
                      Apply
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Export ${preset.name}`}
                      onClick={() => presets.exportPreset(preset)}
                    >
                      <Download className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-danger size-7"
                      aria-label={`Delete ${preset.name}`}
                      onClick={() => presets.deletePreset(preset.id)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload /> Import preset
          </Button>
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
