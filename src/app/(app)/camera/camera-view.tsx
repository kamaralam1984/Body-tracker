"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  DeveloperModePanel,
  FaceAnalyticsCard,
  HandAnalyticsCard,
  LiveInsightsPanel,
  LiveTimeline,
  PoseAnalyticsCard,
  RecordingExportPanel,
  RenderModeSelector,
  SessionSummaryCard,
  TrackingAlerts,
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
  // Separate from cardRef: this wraps BOTH CameraCard and TrackingOverlay
  // (the overlay is a sibling, not a descendant, of CameraCard). Fullscreen
  // must target this wrapper — fullscreening cardRef alone hides the overlay
  // entirely, since the Fullscreen API only renders the fullscreened
  // element's own subtree, not its siblings.
  const fullscreenTargetRef = useRef<HTMLDivElement>(null);
  // The card's `aspect-video` sizing only ever produces a 16:9 box, so
  // fullscreening the wrapper (which the Fullscreen API stretches to fill
  // the viewport) still leaves a small 16:9 preview floating in a sea of
  // black on tall mobile screens. Track fullscreen state so the card can
  // drop its aspect ratio and fill the wrapper's full height instead.
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () =>
      setIsFullscreen(document.fullscreenElement === fullscreenTargetRef.current);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

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
          <TrackingAlerts />

          <div
            ref={fullscreenTargetRef}
            className={cn("relative", isFullscreen && "fixed inset-0 h-screen w-screen bg-black")}
          >
            <CameraCard
              ref={cardRef}
              action={cardAction}
              className={
                isFullscreen ? "aspect-auto h-full w-full rounded-none border-0" : undefined
              }
            />
            <TrackingOverlay
              containerRef={cardRef}
              className={isFullscreen ? "rounded-none" : undefined}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <CameraToolbar onScreenshot={setScreenshot} />
            <FullscreenButton targetRef={fullscreenTargetRef} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <TrackingLegend />
            <RenderModeSelector className="w-44" />
          </div>

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
          <SessionSummaryCard />

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

          <FaceAnalyticsCard />
          <HandAnalyticsCard />
          <PoseAnalyticsCard />
          <LiveTimeline />
          <LiveInsightsPanel />
          <RecordingExportPanel />
          <DeveloperModePanel />

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
