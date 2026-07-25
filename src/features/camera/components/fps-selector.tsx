"use client";

import { Gauge } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { FRAME_RATE_OPTIONS } from "../lib/resolution-presets";

export interface FpsSelectorProps {
  className?: string;
}

const FPS_OPTIONS = FRAME_RATE_OPTIONS.map((fps) => ({
  value: String(fps),
  label: `${fps} fps`,
}));

export function FpsSelector({ className }: FpsSelectorProps) {
  const { settings, setFrameRate } = useCameraContext();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="flex items-center gap-1.5">
        <Gauge className="text-muted-foreground size-3.5" />
        Frame Rate
      </Label>
      <Select
        options={FPS_OPTIONS}
        value={String(settings.frameRate)}
        onValueChange={(value) => {
          void setFrameRate(Number(value));
        }}
        placeholder="Select frame rate"
      />
    </div>
  );
}
