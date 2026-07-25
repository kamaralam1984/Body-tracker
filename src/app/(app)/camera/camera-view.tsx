"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CameraCard,
  CameraProvider,
  CameraSettingsDrawer,
  CameraToolbar,
  FullscreenButton,
  PerformancePanel,
  PermissionDialog,
  PermissionRequiredBanner,
  StatusBadge,
  useCameraContext,
} from "@/features/camera";
import {
  TrackingErrorEmptyState,
  TrackingLegend,
  TrackingLoadingIndicator,
  TrackingOverlay,
  TrackingProvider,
  TrackingStatusBadge,
  TrackingUnavailableEmptyState,
  useTrackingContext,
} from "@/features/tracking";

function CameraPageContent() {
  const { status, start, refresh } = useCameraContext();
  const tracking = useTrackingContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const cardAction = (() => {
    switch (status) {
      case "idle":
      case "stopped":
        return <Button onClick={() => start()}>Start camera</Button>;
      case "permission-required":
        return <Button onClick={() => start()}>Allow camera access</Button>;
      case "permission-denied":
        return (
          <Button variant="outline" onClick={() => setPermissionDialogOpen(true)}>
            View instructions
          </Button>
        );
      case "device-not-found":
      case "camera-busy":
      case "camera-error":
        return (
          <Button variant="outline" onClick={() => refresh()}>
            <RefreshCw />
            Try again
          </Button>
        );
      default:
        return undefined;
    }
  })();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Camera"
        description="Preview and manage your camera before starting a session."
        actions={
          <>
            <StatusBadge />
            <TrackingStatusBadge />
            <Button variant="outline" size="md" asChild>
              <Link href="/camera/analytics">
                <BarChart3 />
                Analytics
              </Link>
            </Button>
            <Button variant="outline" size="md" onClick={() => setSettingsOpen(true)}>
              <Settings />
              Settings
            </Button>
          </>
        }
      />

      <PermissionRequiredBanner />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <div className="relative">
            <CameraCard ref={cardRef} action={cardAction} />
            <TrackingOverlay containerRef={cardRef} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <CameraToolbar onScreenshot={setScreenshot} />
            <FullscreenButton targetRef={cardRef} />
          </div>

          <TrackingLegend />

          {screenshot && (
            <Card className="flex items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL screenshot, next/image doesn't optimize these */}
              <img
                src={screenshot}
                alt="Captured screenshot"
                className="border-border h-20 w-32 rounded-md border object-cover"
              />
              <div className="flex flex-col gap-1">
                <p className="text-foreground text-sm font-medium">Screenshot captured</p>
                <p className="text-muted-foreground text-xs">
                  Kept in this preview only, not uploaded anywhere.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" asChild>
                <a href={screenshot} download="camera-screenshot.png">
                  Download
                </a>
              </Button>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <PerformancePanel />

          {tracking.status === "initializing" && <TrackingLoadingIndicator />}
          {tracking.status === "unsupported" && <TrackingUnavailableEmptyState />}
          {tracking.status === "error" && (
            <TrackingErrorEmptyState
              action={
                <Button variant="outline" size="sm" onClick={() => tracking.retry()}>
                  Retry
                </Button>
              }
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground flex flex-col gap-3 text-sm">
              <p>Use a well-lit room for the clearest preview.</p>
              <p>Position the camera at eye level for the most natural framing.</p>
              <p className="flex flex-wrap items-center gap-1.5">
                Press
                <kbd className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[11px]">
                  Space
                </kbd>
                to pause,
                <kbd className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[11px]">
                  M
                </kbd>
                to mirror,
                <kbd className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[11px]">
                  S
                </kbd>
                to capture.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <PermissionDialog
        open={permissionDialogOpen}
        onClose={() => setPermissionDialogOpen(false)}
      />
      <CameraSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function CameraWithTracking() {
  const { videoRef, status } = useCameraContext();
  return (
    <TrackingProvider videoRef={videoRef} active={status === "running"}>
      <CameraPageContent />
    </TrackingProvider>
  );
}

export function CameraView() {
  return (
    <CameraProvider>
      <CameraWithTracking />
    </CameraProvider>
  );
}
