"use client";

/**
 * Watches live camera/tracking booleans (passed in by the page — this hook
 * never imports `@/features/camera` or `@/features/tracking` directly) and
 * logs meaningful transitions into the session store's timeline.
 *
 * const { status: cameraStatus } = useCameraContext();
 * const { frameRef } = useTrackingContext();
 * useSessionRecorder({
 *   cameraRunning: cameraStatus === "running",
 *   faceDetected: Boolean(frameRef.current?.face),
 *   handDetected: (frameRef.current?.hands.length ?? 0) > 0,
 * });
 */

import { useEffect, useRef } from "react";
import { useSessionStore } from "../store/session-store";
import type { ActivityType } from "../types";

export interface UseSessionRecorderOptions {
  cameraRunning: boolean;
  faceDetected: boolean;
  handDetected: boolean;
  activity?: ActivityType;
}

export function useSessionRecorder({
  cameraRunning,
  faceDetected,
  handDetected,
  activity,
}: UseSessionRecorderOptions) {
  const startSession = useSessionStore((s) => s.startSession);
  const endSession = useSessionStore((s) => s.endSession);
  const addTimelineEvent = useSessionStore((s) => s.addTimelineEvent);
  const setActivity = useSessionStore((s) => s.setActivity);

  const prevCameraRunning = useRef(false);
  const prevFace = useRef(false);
  const prevHand = useRef(false);

  useEffect(() => {
    if (cameraRunning && !prevCameraRunning.current) {
      startSession();
      addTimelineEvent("tracking-started", "Tracking started");
    } else if (!cameraRunning && prevCameraRunning.current) {
      endSession();
    }
    prevCameraRunning.current = cameraRunning;
  }, [cameraRunning, startSession, endSession, addTimelineEvent]);

  useEffect(() => {
    if (faceDetected && !prevFace.current) {
      addTimelineEvent("face-found", "Face detected");
    } else if (!faceDetected && prevFace.current) {
      addTimelineEvent("face-lost", "Face lost");
    }
    prevFace.current = faceDetected;
  }, [faceDetected, addTimelineEvent]);

  useEffect(() => {
    if (handDetected && !prevHand.current) {
      addTimelineEvent("hand-found", "Hand detected");
    } else if (!handDetected && prevHand.current) {
      addTimelineEvent("hand-lost", "Hand lost");
    }
    prevHand.current = handDetected;
  }, [handDetected, addTimelineEvent]);

  useEffect(() => {
    if (activity) setActivity(activity);
  }, [activity, setActivity]);
}
