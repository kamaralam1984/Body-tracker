"use client";

import { Camera } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

export interface DeviceSelectorProps {
  className?: string;
}

export function DeviceSelector({ className }: DeviceSelectorProps) {
  const { devices, settings, switchDevice } = useCameraContext();

  const options = devices.map((device) => ({
    value: device.deviceId,
    label: device.label,
  }));

  const hasMatch = Boolean(
    settings.deviceId && devices.some((d) => d.deviceId === settings.deviceId),
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="flex items-center gap-1.5">
        <Camera className="text-muted-foreground size-3.5" />
        Camera
      </Label>
      <Select
        options={options}
        value={hasMatch ? settings.deviceId : undefined}
        onValueChange={(deviceId) => {
          void switchDevice(deviceId);
        }}
        placeholder={devices.length === 0 ? "No cameras found" : "Default camera"}
      />
    </div>
  );
}
