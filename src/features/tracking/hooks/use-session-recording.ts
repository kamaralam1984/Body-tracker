"use client";

/**
 * Local-only video recording of the live camera preview — `MediaRecorder`
 * against the camera's own `MediaStream` (from `useCameraContext()`),
 * downloaded as a `.webm` directly to the user's device. Never uploaded
 * anywhere, matching this app's existing "video never leaves the browser"
 * privacy narrative — recording is purely a local save, user-initiated,
 * same trust boundary as the existing screenshot feature.
 *
 * Optional microphone track — on by default (most people recording a
 * session want their voice in it), toggleable before starting since
 * nothing else in this app uses audio. Real
 * `noiseSuppression`/`echoCancellation`/`autoGainControl` constraints (all
 * standard `MediaTrackConstraints` fields) apply once the mic is requested.
 *
 * Pause/resume/timer/live size are all genuinely real — `MediaRecorder`
 * already supports `pause()`/`resume()`, chunk sizes accumulate as real
 * bytes, and `navigator.storage.estimate()` is a real quota API. MP4 is not
 * guaranteed cross-browser (Chrome/Firefox reliably produce WebM;
 * Safari's `MediaRecorder` often defaults to MP4/H.264 on its own) — this
 * stays WebM-first rather than pretending otherwise.
 *
 * Records a composited canvas (`use-recording-canvas.ts`), not the raw
 * camera `MediaStream` — so the tracking overlay actually ends up in the
 * downloaded file, matching whatever's on screen, instead of silently
 * being a DOM-only layer that never reached the recording.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { downloadFile } from "@/lib/download-file";
import { fixWebmDuration } from "@/lib/fix-webm-duration";
import { useRecordingCanvas, type CompositeRecordingSource } from "./use-recording-canvas";

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
}

/** Real, standard `MediaTrackConstraints` fields — only actually take effect once a mic track is requested (this app doesn't request audio by default). */
export interface AudioAdjustments {
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

const DEFAULT_AUDIO_ADJUSTMENTS: AudioAdjustments = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

export interface RecordingStats {
  elapsedSeconds: number;
  bytesRecorded: number;
  mimeType: string | null;
  estimatedRemainingBytes: number | null;
}

export interface UseSessionRecordingResult {
  isRecording: boolean;
  isPaused: boolean;
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  audioDevices: AudioDeviceInfo[];
  selectedMicId: string | undefined;
  setSelectedMicId: (deviceId: string | undefined) => void;
  audioAdjustments: AudioAdjustments;
  setAudioAdjustments: (adjustments: Partial<AudioAdjustments>) => void;
  refreshAudioDevices: () => Promise<void>;
  startRecording: (source: CompositeRecordingSource) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  stats: RecordingStats;
  /** The live mic `MediaStreamTrack`, if a mic is currently attached — for a real level meter (Web Audio `AnalyserNode`). */
  micTrack: MediaStreamTrack | null;
  error: string | null;
}

const STATS_INTERVAL_MS = 500;

function pickSupportedMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

export function useSessionRecording(): UseSessionRecordingResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Defaults on — most people recording a session want their voice in it,
  // and it's just as easy to toggle off before starting as it would be to
  // opt in. The mic permission prompt only actually fires once recording
  // starts, same as before.
  const [micEnabled, setMicEnabled] = useState(true);
  const [audioDevices, setAudioDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>(undefined);
  const [audioAdjustments, setAudioAdjustmentsState] =
    useState<AudioAdjustments>(DEFAULT_AUDIO_ADJUSTMENTS);
  const [error, setError] = useState<string | null>(null);
  const [micTrack, setMicTrack] = useState<MediaStreamTrack | null>(null);
  const [stats, setStats] = useState<RecordingStats>({
    elapsedSeconds: 0,
    bytesRecorded: 0,
    mimeType: null,
    estimatedRemainingBytes: null,
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAccumRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Captured synchronously in `stopRecording()`, since `startedAtRef` is
  // already cleared by the time the recorder's async `onstop` fires — this
  // is what lets us patch a real Duration into the downloaded file (see
  // fix-webm-duration.ts) using our own paused-time-excluded elapsed time
  // rather than re-deriving it from the container's Cluster timecodes.
  const finalElapsedMsRef = useRef(0);
  const { start: startCompositeCanvas, stop: stopCompositeCanvas } = useRecordingCanvas();

  const setAudioAdjustments = useCallback((adjustments: Partial<AudioAdjustments>) => {
    setAudioAdjustmentsState((prev) => ({ ...prev, ...adjustments }));
  }, []);

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(
        list
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
      );
    } catch {
      // Non-fatal — the mic list just stays empty.
    }
  }, []);

  const pushStats = useCallback(() => {
    const startedAt = startedAtRef.current;
    if (startedAt === null) return;
    const pausedNow = pausedAtRef.current !== null ? Date.now() - pausedAtRef.current : 0;
    const elapsedSeconds = (Date.now() - startedAt - pausedAccumRef.current - pausedNow) / 1000;
    const bytesRecorded = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);

    setStats((prev) => ({ ...prev, elapsedSeconds: Math.max(elapsedSeconds, 0), bytesRecorded }));

    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      void navigator.storage.estimate().then((estimate) => {
        if (estimate.quota !== undefined && estimate.usage !== undefined) {
          setStats((prev) => ({
            ...prev,
            estimatedRemainingBytes: Math.max(estimate.quota! - estimate.usage!, 0),
          }));
        }
      });
    }
  }, []);

  const startRecording = useCallback(
    async (source: CompositeRecordingSource) => {
      setError(null);

      const canvasStream = startCompositeCanvas(source);
      if (!canvasStream) {
        setError("Camera preview isn't ready yet — try again in a moment.");
        return;
      }
      let combined = canvasStream;

      if (micEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
              noiseSuppression: audioAdjustments.noiseSuppression,
              echoCancellation: audioAdjustments.echoCancellation,
              autoGainControl: audioAdjustments.autoGainControl,
            },
          });
          micStreamRef.current = audioStream;
          const audioTrack = audioStream.getAudioTracks()[0] ?? null;
          setMicTrack(audioTrack);
          combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
        } catch {
          setError("Couldn't access the microphone — recording video only.");
        }
      }

      try {
        const mimeType = pickSupportedMimeType();
        const recorder = new MediaRecorder(combined, { mimeType });
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
          void fixWebmDuration(rawBlob, finalElapsedMsRef.current).then((blob) => {
            downloadFile(`camera-session-${Date.now()}.webm`, blob);
          });
          chunksRef.current = [];
          micStreamRef.current?.getTracks().forEach((track) => track.stop());
          micStreamRef.current = null;
          setMicTrack(null);
        };
        recorder.start(1000); // 1s timeslice — chunks arrive incrementally, so live size/estimate stay accurate mid-recording
        recorderRef.current = recorder;

        startedAtRef.current = Date.now();
        pausedAccumRef.current = 0;
        pausedAtRef.current = null;
        setStats({ elapsedSeconds: 0, bytesRecorded: 0, mimeType, estimatedRemainingBytes: null });
        setIsRecording(true);
        setIsPaused(false);
        statsIntervalRef.current = setInterval(pushStats, STATS_INTERVAL_MS);
      } catch {
        setError("Recording isn't supported in this browser.");
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
        setMicTrack(null);
      }
    },
    [micEnabled, selectedMicId, audioAdjustments, pushStats, startCompositeCanvas],
  );

  const pauseRecording = useCallback(() => {
    if (recorderRef.current?.state !== "recording") return;
    recorderRef.current.pause();
    pausedAtRef.current = Date.now();
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current?.state !== "paused") return;
    recorderRef.current.resume();
    if (pausedAtRef.current !== null) {
      pausedAccumRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setIsPaused(false);
  }, []);

  const stopRecording = useCallback(() => {
    const startedAt = startedAtRef.current;
    if (startedAt !== null) {
      const pausedNow = pausedAtRef.current !== null ? Date.now() - pausedAtRef.current : 0;
      finalElapsedMsRef.current = Math.max(
        Date.now() - startedAt - pausedAccumRef.current - pausedNow,
        0,
      );
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
    stopCompositeCanvas();
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    statsIntervalRef.current = null;
    startedAtRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
  }, [stopCompositeCanvas]);

  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, []);

  return {
    isRecording,
    isPaused,
    micEnabled,
    setMicEnabled,
    audioDevices,
    selectedMicId,
    setSelectedMicId,
    audioAdjustments,
    setAudioAdjustments,
    refreshAudioDevices,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    stats,
    micTrack,
    error,
  };
}
