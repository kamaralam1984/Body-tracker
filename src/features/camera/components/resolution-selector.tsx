"use client";

import { ScanEye } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { RESOLUTION_OPTIONS } from "../lib/resolution-presets";
import type { ResolutionPreset } from "../types";

export interface ResolutionSelectorProps {
  className?: string;
}

export function ResolutionSelector({ className }: ResolutionSelectorProps) {
  const { settings, setResolution } = useCameraContext();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="flex items-center gap-1.5">
        <ScanEye className="text-muted-foreground size-3.5" />
        Resolution
      </Label>
      <Select
        options={RESOLUTION_OPTIONS}
        value={settings.resolution}
        onValueChange={(value) => {
          void setResolution(value as ResolutionPreset);
        }}
        placeholder="Select resolution"
      />
    </div>
  );
}
