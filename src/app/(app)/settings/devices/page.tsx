"use client";

import { Laptop, Smartphone, Tablet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { formatRelativeDate } from "@/features/settings/lib/settings-format";
import { useDevicesQuery } from "@/features/settings/hooks/use-settings-queries";
import { useSettingsStore } from "@/features/settings/store/settings-store";
import type { ConnectedDevice, DeviceType } from "@/features/settings/types";

const DEVICE_ICONS: Record<DeviceType, typeof Laptop> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
};

function DeviceRow({ device }: { device: ConnectedDevice }) {
  const setDeviceTrust = useSettingsStore((s) => s.setDeviceTrust);
  const removeDevice = useSettingsStore((s) => s.removeDevice);
  const Icon = DEVICE_ICONS[device.type];

  function handleTrustChange(checked: boolean) {
    setDeviceTrust(device.id, checked);
    toast.success(checked ? "Device marked as trusted" : "Device marked as untrusted");
  }

  function handleRemove() {
    removeDevice(device.id);
    toast.success("Device removed");
  }

  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-9 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-foreground text-sm font-medium">{device.name}</p>
            {device.isCurrent && <Badge variant="accent">This device</Badge>}
          </div>
          <p className="text-muted-foreground text-xs">
            {device.browser} on {device.os} · {device.location} ·{" "}
            <span className="font-mono">{device.ipAddress}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            {device.isCurrent
              ? "Active now"
              : `Last active ${formatRelativeDate(device.lastActiveAt)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`trust-${device.id}`}
            className="text-muted-foreground text-xs font-medium"
          >
            Trusted device
          </label>
          <Switch
            id={`trust-${device.id}`}
            checked={device.trusted}
            disabled={device.isCurrent}
            onCheckedChange={handleTrustChange}
          />
        </div>
        <Button variant="ghost" size="sm" disabled={device.isCurrent} onClick={handleRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}

export default function DevicesSettingsPage() {
  const { data, isLoading } = useDevicesQuery();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected devices</CardTitle>
          <CardDescription>
            Devices that are signed in to your account, or have been in the past. Mark a device as
            trusted to skip extra verification, or remove one you no longer recognize.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-border-subtle flex flex-col divide-y">
          {isLoading ? (
            <div className="flex flex-col gap-4 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={Laptop}
              title="No connected devices"
              description="Devices you sign in from will appear here."
            />
          ) : (
            data.map((device) => <DeviceRow key={device.id} device={device} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
