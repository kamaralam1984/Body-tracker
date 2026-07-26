"use client";

import { RectangleHorizontal } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import type { CameraAspectRatio } from "../types";

const OPTIONS: SelectOption[] = [
  { value: "16:9", label: "16:9 Widescreen" },
  { value: "4:3", label: "4:3 Standard" },
  { value: "1:1", label: "1:1 Square" },
  { value: "9:16", label: "9:16 Portrait" },
];

export function AspectRatioSelector({ className }: { className?: string }) {
  const { settings, setAspectRatio } = useCameraContext();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="flex items-center gap-1.5">
        <RectangleHorizontal className="text-muted-foreground size-3.5" />
        Aspect Ratio
      </Label>
      <Select
        options={OPTIONS}
        value={settings.aspectRatio}
        onValueChange={(value) => setAspectRatio(value as CameraAspectRatio)}
        placeholder="Select aspect ratio"
      />
    </div>
  );
}
