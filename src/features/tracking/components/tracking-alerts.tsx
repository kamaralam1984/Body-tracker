"use client";

/**
 * Smart alert banners for the live camera page — combines camera connection
 * state (`useCameraContext()`) with live tracking signals
 * (`useTrackingContext().live`) so "camera disconnected" and "no face
 * detected"/"poor posture"/"eyes closed too long" all render the same way.
 *
 * <TrackingAlerts />
 */

import { AlertTriangle, CameraOff, EyeOff, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCameraContext } from "@/features/camera";
import { useTrackingContext } from "../context/tracking-provider";

const NO_FACE_ALERT_SECONDS = 3; // matches FACE_LOST_DISTRACTION_MS in use-tracking-session-sync.ts
const EYES_CLOSED_ALERT_SECONDS = 3; // sustained closure, distinct from a normal blink
const POOR_POSTURE_THRESHOLD = 50;

interface Alert {
  id: string;
  icon: LucideIcon;
  message: string;
}

function AlertRow({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="bg-danger-bg text-danger-600 dark:text-danger-500 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      {message}
    </div>
  );
}

export function TrackingAlerts({ className }: { className?: string }) {
  const { status: cameraStatus } = useCameraContext();
  const { live } = useTrackingContext();

  const alerts: Alert[] = [];

  if (cameraStatus === "camera-error" || cameraStatus === "reconnecting") {
    alerts.push({ id: "camera-disconnected", icon: CameraOff, message: "Camera disconnected" });
  }
  if (
    live.sessionStartedAt &&
    !live.faceDetected &&
    live.faceLostSeconds >= NO_FACE_ALERT_SECONDS
  ) {
    alerts.push({ id: "no-face", icon: UserX, message: "No face detected" });
  }
  if (live.faceDetected && live.eyesClosedSeconds >= EYES_CLOSED_ALERT_SECONDS) {
    alerts.push({ id: "eyes-closed", icon: EyeOff, message: "Eyes closed too long" });
  }
  if (
    live.faceDetected &&
    live.postureScoreLive !== null &&
    live.postureScoreLive < POOR_POSTURE_THRESHOLD
  ) {
    alerts.push({ id: "poor-posture", icon: AlertTriangle, message: "Poor posture detected" });
  }

  if (alerts.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)} role="alert">
      {alerts.map((alert) => (
        <AlertRow key={alert.id} icon={alert.icon} message={alert.message} />
      ))}
    </div>
  );
}
