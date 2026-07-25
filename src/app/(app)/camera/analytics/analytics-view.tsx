"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CameraProvider, useCameraContext, type CameraStatus } from "@/features/camera";
import { TrackingProvider, useTrackingContext, type TrackingStatus } from "@/features/tracking";
import {
  ActivityCards,
  AnalyticsFiltersBar,
  ChartsSection,
  LiveTimeline,
  SessionKpiGrid,
  SessionPanel,
  useSessionRecorder,
  type QualityLevel,
} from "@/features/session-analytics";
import { REPORTING_TABS, ReportingTabContent } from "./reporting-tabs";

function trackingStatusToQuality(status: TrackingStatus): QualityLevel {
  switch (status) {
    case "excellent":
      return "excellent";
    case "good":
      return "good";
    case "limited":
      return "limited";
    case "searching":
    case "initializing":
    case "reconnecting":
      return "searching";
    default:
      return "offline";
  }
}

const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  idle: "Offline",
  initializing: "Starting…",
  waiting: "Starting…",
  ready: "Live",
  running: "Live",
  paused: "Paused",
  stopped: "Offline",
  "permission-required": "Permission needed",
  "permission-denied": "Access denied",
  "device-not-found": "No camera",
  "camera-busy": "Busy",
  "camera-error": "Error",
  reconnecting: "Reconnecting…",
  unsupported: "Unsupported",
};

const UNHEALTHY_CAMERA_STATUSES: CameraStatus[] = [
  "camera-error",
  "camera-busy",
  "device-not-found",
  "unsupported",
  "permission-denied",
];

function AnalyticsDashboardContent() {
  const camera = useCameraContext();
  const tracking = useTrackingContext();
  const [faceDetected, setFaceDetected] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [tab, setTab] = useState<string>("overview");

  useEffect(() => {
    const interval = setInterval(() => {
      const frame = tracking.frameRef.current;
      setFaceDetected(Boolean(frame?.face));
      setHandDetected((frame?.hands.length ?? 0) > 0);
    }, 500);
    return () => clearInterval(interval);
  }, [tracking.frameRef]);

  const connectionHealthy =
    !UNHEALTHY_CAMERA_STATUSES.includes(camera.status) && tracking.status !== "error";
  const isLive = camera.status === "running" || camera.status === "ready";

  useSessionRecorder({
    cameraRunning: isLive,
    faceDetected,
    handDetected,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Session analytics"
        description="A live control center for your tracking sessions."
        actions={
          <>
            <Button variant="outline" size="md" asChild>
              <Link href="/camera">
                <Video />
                Live camera
              </Link>
            </Button>
            {!isLive && (
              <Button variant="primary" size="md" onClick={() => camera.start()}>
                Start live session
              </Button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {REPORTING_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-col gap-6">
            <AnalyticsFiltersBar />

            <SessionKpiGrid
              cameraStatusLabel={CAMERA_STATUS_LABEL[camera.status]}
              trackingQuality={trackingStatusToQuality(tracking.status)}
              faceDetected={faceDetected}
              handDetected={handDetected}
              connectionHealthy={connectionHealthy}
            />

            <ActivityCards />

            <ChartsSection />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <LiveTimeline />
              </div>
              <SessionPanel cameraLabel={isLive ? "Default camera" : "Not connected"} />
            </div>
          </div>
        </TabsContent>

        {REPORTING_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <ReportingTabContent tab={t.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AnalyticsWithTracking() {
  const { videoRef, status } = useCameraContext();
  return (
    <TrackingProvider videoRef={videoRef} active={status === "running"}>
      <AnalyticsDashboardContent />
    </TrackingProvider>
  );
}

export function AnalyticsView() {
  return (
    <CameraProvider>
      <AnalyticsWithTracking />
    </CameraProvider>
  );
}
