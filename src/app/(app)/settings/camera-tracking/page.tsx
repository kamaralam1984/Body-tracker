"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, type SelectOption } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { useSettingsStore } from "@/features/settings";
import type { CameraFps, CameraResolution, PerformanceMode } from "@/features/settings";

// Mirrors the device vocabulary `@/features/camera` uses elsewhere in the
// app, without importing that feature — there's no live device enumeration
// wired into Settings, so this is a plausible, fixed option list.
const CAMERA_OPTIONS: SelectOption[] = [
  { value: "default", label: "Default camera" },
  { value: "facetime-hd", label: "FaceTime HD Camera" },
  { value: "studio-cam-1", label: "Studio Cam 1" },
  { value: "studio-cam-2", label: "Studio Cam 2" },
];

const RESOLUTION_OPTIONS: CameraResolution[] = ["480p", "720p", "1080p"];
const FPS_OPTIONS: CameraFps[] = [24, 30, 60];

const PERFORMANCE_MODE_OPTIONS: { value: PerformanceMode; label: string; description: string }[] = [
  { value: "performance", label: "Performance", description: "Fastest, lowest CPU usage" },
  {
    value: "balanced",
    label: "Balanced",
    description: "Good tracking quality with moderate performance",
  },
  {
    value: "accuracy",
    label: "Accuracy",
    description: "Highest tracking precision, more CPU intensive",
  },
];

export default function CameraTrackingSettingsPage() {
  const cameraTracking = useSettingsStore((s) => s.cameraTracking);
  const setCameraTracking = useSettingsStore((s) => s.setCameraTracking);
  const resetCameraTracking = useSettingsStore((s) => s.resetCameraTracking);

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="info" title="These are saved preferences">
        Changes here are persisted and will inform the live camera and tracking experience in the
        tracking workspace. This settings page doesn&apos;t run an active camera feed itself, so
        there&apos;s no live preview here.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Camera</CardTitle>
          <CardDescription>Choose which camera and capture settings to use.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium">Preferred camera</p>
            <Select
              options={CAMERA_OPTIONS}
              value={cameraTracking.preferredCameraId ?? "default"}
              onValueChange={(value) =>
                setCameraTracking({ preferredCameraId: value === "default" ? null : value })
              }
              className="max-w-xs"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium">Resolution</p>
            <ButtonGroup>
              {RESOLUTION_OPTIONS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={cameraTracking.resolution === value ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setCameraTracking({ resolution: value })}
                >
                  {value}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium">Frame rate</p>
            <ButtonGroup>
              {FPS_OPTIONS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={cameraTracking.fps === value ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setCameraTracking({ fps: value })}
                >
                  {value} fps
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-sm font-medium">Mirror mode</span>
              <span className="text-muted-foreground text-xs">
                Flip the camera preview horizontally, like a mirror.
              </span>
            </div>
            <Switch
              id="mirror-mode"
              checked={cameraTracking.mirrorMode}
              onCheckedChange={(checked) => setCameraTracking({ mirrorMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-sm font-medium">Auto-start on page load</span>
              <span className="text-muted-foreground text-xs">
                Start the camera automatically when you open a tracking page.
              </span>
            </div>
            <Switch
              id="auto-start"
              checked={cameraTracking.autoStart}
              onCheckedChange={(checked) => setCameraTracking({ autoStart: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracking</CardTitle>
          <CardDescription>Fine-tune how tracking behaves.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Slider
            id="tracking-sensitivity"
            label="Tracking sensitivity"
            value={cameraTracking.trackingSensitivity}
            onChange={(value) => setCameraTracking({ trackingSensitivity: value })}
            unit="%"
          />

          <div className="flex flex-col gap-1.5">
            <Slider
              id="smoothing"
              label="Smoothing"
              value={cameraTracking.smoothing}
              onChange={(value) => setCameraTracking({ smoothing: value })}
              unit="%"
            />
            <p className="text-muted-foreground text-xs">
              Higher smoothing reduces jitter but adds slight latency.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Slider
              id="detection-distance"
              label="Detection distance"
              value={cameraTracking.detectionDistance}
              onChange={(value) => setCameraTracking({ detectionDistance: value })}
              unit="%"
            />
            <p className="text-muted-foreground text-xs">
              How far from the camera a person can be detected.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium">Performance mode</p>
            <RadioGroup
              value={cameraTracking.performanceMode}
              onValueChange={(value) =>
                setCameraTracking({ performanceMode: value as PerformanceMode })
              }
            >
              {PERFORMANCE_MODE_OPTIONS.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-start gap-2.5">
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-foreground text-sm">{option.label}</span>
                    <span className="text-muted-foreground text-xs">{option.description}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetCameraTracking();
            toast.success("Camera & tracking settings reset");
          }}
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
