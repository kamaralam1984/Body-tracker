"use client";

/**
 * Local-only video recording of the live camera preview — `MediaRecorder`
 * against the camera's own `MediaStream` (from `useCameraContext()`),
 * downloaded as a `.webm` directly to the user's device. Never uploaded
 * anywhere, matching this app's existing "video never leaves the browser"
 * privacy narrative — recording is purely a local save, user-initiated,
 * same trust boundary as the existing screenshot feature.
 *
 * Optional microphone track — off by default, since nothing else in this
 * app uses audio; only meaningful here, for narrating a recorded clip.
 */

import { useCallback, useRef, useState } from "react";
import { downloadFile } from "@/lib/download-file";

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
}

export interface UseSessionRecordingResult {
  isRecording: boolean;
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  audioDevices: AudioDeviceInfo[];
  selectedMicId: string | undefined;
  setSelectedMicId: (deviceId: string | undefined) => void;
  refreshAudioDevices: () => Promise<void>;
  startRecording: (videoStream: MediaStream) => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

function pickSupportedMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

export function useSessionRecording(): UseSessionRecordingResult {
  const [isRecording, setIsRecording] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);

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

  const startRecording = useCallback(
    async (videoStream: MediaStream) => {
      setError(null);
      let combined = videoStream;

      if (micEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
          });
          micStreamRef.current = audioStream;
          combined = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
        } catch {
          setError("Couldn't access the microphone — recording video only.");
        }
      }

      try {
        const recorder = new MediaRecorder(combined, { mimeType: pickSupportedMimeType() });
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          downloadFile(`camera-session-${Date.now()}.webm`, blob);
          chunksRef.current = [];
          micStreamRef.current?.getTracks().forEach((track) => track.stop());
          micStreamRef.current = null;
        };
        recorder.start();
        recorderRef.current = recorder;
        setIsRecording(true);
      } catch {
        setError("Recording isn't supported in this browser.");
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
    },
    [micEnabled, selectedMicId],
  );

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    micEnabled,
    setMicEnabled,
    audioDevices,
    selectedMicId,
    setSelectedMicId,
    refreshAudioDevices,
    startRecording,
    stopRecording,
    error,
  };
}
