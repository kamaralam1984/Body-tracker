"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CameraCard,
  CameraProvider,
  CameraSettingsDrawer,
  CameraTopBar,
  CAMERA_KEYBOARD_SHORTCUTS,
  DeviceInfoCard,
  FloatingControlDock,
  GridOverlay,
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
  type TrackingStatus,
} from "@/features/tracking";

function aiStatusLabel(status: TrackingStatus): string | undefined {
  switch (status) {
    case "idle":
      return undefined;
    case "initializing":
      return "Starting AI…";
    case "reconnecting":
      return "Reconnecting…";
    case "error":
      return "AI unavailable";
    case "unsupported":
      return "AI unsupported";
    // searching/excellent/good/limited/lost all mean the model is actively
    // tracking — the fine-grained quality is what TrackingStatusBadge shows.
    default:
      return "Tracking";
  }
}

function CameraPageContent() {
  const { status, start, refresh, videoRef, settings } = useCameraContext();
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
      {!isFullscreen && (
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
            </>
          }
        />
      )}

      {!isFullscreen && <PermissionRequiredBanner />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div
          className={cn("flex flex-col gap-4", isFullscreen ? "xl:col-span-3" : "xl:col-span-2")}
        >
          {!isFullscreen && <TrackingAlerts />}

          <div
            ref={fullscreenTargetRef}
            className={cn(
              "relative",
              isFullscreen && "fixed inset-0 z-40 h-screen w-screen bg-black",
            )}
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
            <GridOverlay mode={settings.gridOverlay} />
            <CameraTopBar
              isRecording={tracking.recording.isRecording}
              aiStatusLabel={aiStatusLabel(tracking.status)}
              processingTimeMs={tracking.perf.processingTimeMs}
              videoRef={videoRef}
              fullscreenTargetRef={fullscreenTargetRef}
              onSettingsClick={() => setSettingsOpen(true)}
            />
            <FloatingControlDock containerRef={fullscreenTargetRef} onScreenshot={setScreenshot} />
          </div>

          {!isFullscreen && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TrackingLegend />
              <RenderModeSelector className="w-44" />
            </div>
          )}

          {!isFullscreen && screenshot && (
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

        {!isFullscreen && (
          <Accordion
            type="multiple"
            defaultValue={["general", "video", "ai", "recording", "advanced"]}
            className="flex flex-col gap-1"
          >
            <AccordionItem value="general">
              <AccordionTrigger className="text-sm font-semibold tracking-wide uppercase">
                General
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4">
                  <PerformancePanel />
                  <DeviceInfoCard />
                  <SessionSummaryCard />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="video">
              <AccordionTrigger className="text-sm font-semibold tracking-wide uppercase">
                Video
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4">
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
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai">
              <AccordionTrigger className="text-sm font-semibold tracking-wide uppercase">
                AI insights
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4">
                  <LiveTimeline />
                  <LiveInsightsPanel />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="recording">
              <AccordionTrigger className="text-sm font-semibold tracking-wide uppercase">
                Recording
              </AccordionTrigger>
              <AccordionContent>
                <RecordingExportPanel />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="advanced">
              <AccordionTrigger className="text-sm font-semibold tracking-wide uppercase">
                Advanced
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4">
                  <DeveloperModePanel />
                  <Card>
                    <CardHeader>
                      <CardTitle>Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground flex flex-col gap-3 text-sm">
                      <p>Use a well-lit room for the clearest preview.</p>
                      <p>Position the camera at eye level for the most natural framing.</p>
                      <div className="flex flex-col gap-1.5">
                        {CAMERA_KEYBOARD_SHORTCUTS.map((shortcut) => (
                          <div key={shortcut.key} className="flex items-center gap-2">
                            <kbd className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[11px]">
                              {shortcut.key}
                            </kbd>
                            <span>{shortcut.action}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
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
