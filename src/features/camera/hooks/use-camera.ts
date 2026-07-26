"use client";

/**
 * Core camera hook — wraps MediaDevices/getUserMedia with a status state
 * machine, device enumeration, resolution/fps constraints, mirror mode,
 * screenshot capture, FPS/stat sampling, and auto-reconnect on track loss.
 *
 * Framework-agnostic aside from React: no UI here. `CameraProvider` (in
 * ../context/camera-provider.tsx) shares one instance across a component
 * tree; call this hook directly only if a screen needs its own isolated
 * camera instance.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type {
  CameraAspectRatio,
  CameraDeviceInfo,
  CameraError,
  CameraSettingsState,
  CameraStats,
  CameraStatus,
  ExtendedMediaTrackCapabilities,
  ExtendedMediaTrackConstraintSet,
  FacingMode,
  GridOverlayMode,
  ImageAdjustments,
  ResolutionPreset,
} from "../types";
import { DEFAULT_CAMERA_SETTINGS } from "../types";
import { getResolutionDimensions } from "../lib/resolution-presets";
import { mapCameraError } from "../lib/map-camera-error";

const MAX_RECONNECT_ATTEMPTS = 3;

// `navigator.mediaDevices` never exists during SSR, so checking it directly on
// every render would report `false` server-side and (usually) `true` on the
// client's very first paint — a real prop mismatch (e.g. every disabled state
// derived from it) that React's hydration diff would flag. Routing it through
// useSyncExternalStore forces the server snapshot and the client's first
// render to agree (both `false`), then updates after mount — the same
// hydration-safe pattern as `useMounted`/`useMediaQuery`.
const noopSubscribe = () => () => {};
function getMediaSupportSnapshot() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}
function getMediaSupportServerSnapshot() {
  return false;
}

const EMPTY_STATS: CameraStats = {
  fps: 0,
  width: 0,
  height: 0,
  frameCount: 0,
  uptimeMs: 0,
  startedAt: null,
};

export interface UseCameraOptions {
  initialSettings?: Partial<CameraSettingsState>;
}

export interface UseCameraResult {
  status: CameraStatus;
  error: CameraError | null;
  stream: MediaStream | null;
  devices: CameraDeviceInfo[];
  settings: CameraSettingsState;
  stats: CameraStats;
  isSupported: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  refresh: () => Promise<void>;
  switchDevice: (deviceId: string) => Promise<void>;
  setResolution: (preset: ResolutionPreset) => Promise<void>;
  setFrameRate: (fps: number) => Promise<void>;
  toggleMirror: () => void;
  setAutoStart: (value: boolean) => void;
  takeScreenshot: () => string | null;
  resetSettings: () => void;
  setAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
  setAspectRatio: (aspectRatio: CameraAspectRatio) => void;
  setGridOverlay: (gridOverlay: GridOverlayMode) => void;
  setLowLightBoost: (enabled: boolean) => void;
  /** Real per-device support (zoom range, torch, exposure/focus modes) — `null` until a stream starts, feature-detected from `track.getCapabilities()`. Most desktop webcams report none of these; that's the honest answer, not a bug. */
  capabilities: ExtendedMediaTrackCapabilities | null;
  /** Calls `track.applyConstraints()` on the live video track for a capability found in `capabilities`. Silently no-ops if the device doesn't actually support it. */
  applyTrackConstraints: (constraints: ExtendedMediaTrackConstraintSet) => Promise<void>;
  /** Restarts the stream requesting the other-facing camera (mobile front/back) — a no-op `ideal` constraint, so unsupported devices just keep their current camera. */
  flipFacing: () => Promise<void>;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [settings, setSettings] = useState<CameraSettingsState>({
    ...DEFAULT_CAMERA_SETTINGS,
    ...options.initialSettings,
  });
  const [stats, setStats] = useState<CameraStats>(EMPTY_STATS);
  const [capabilities, setCapabilities] = useState<ExtendedMediaTrackCapabilities | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsWindowStartRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const isSupported = useSyncExternalStore(
    noopSubscribe,
    getMediaSupportSnapshot,
    getMediaSupportServerSnapshot,
  );

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const refreshDeviceList = useCallback(async () => {
    if (!isSupported) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
          groupId: d.groupId,
        }));
      setDevices(videoInputs);
    } catch {
      // Non-fatal — the device list just stays empty/stale.
    }
  }, [isSupported]);

  const buildConstraints = useCallback(
    (overrides?: Partial<CameraSettingsState>): MediaStreamConstraints => {
      const merged = { ...settings, ...overrides };
      const dims = getResolutionDimensions(merged.resolution);
      const video: MediaTrackConstraints = { frameRate: { ideal: merged.frameRate } };
      if (merged.deviceId) video.deviceId = { exact: merged.deviceId };
      if (merged.facingMode) video.facingMode = { ideal: merged.facingMode };
      if (dims?.width && dims?.height) {
        video.width = { ideal: dims.width };
        video.height = { ideal: dims.height };
      }
      return { video, audio: false };
    },
    [settings],
  );

  const attachStream = useCallback((next: MediaStream) => {
    streamRef.current = next;
    setStream(next);
    if (videoRef.current) videoRef.current.srcObject = next;
  }, []);

  // Holds the latest `startInternal` so the track-ended reconnect listener
  // (registered once per stream) can always call the current version without
  // creating a circular useCallback dependency.
  const startInternalRef = useRef<(overrides?: Partial<CameraSettingsState>) => Promise<void>>(
    async () => {},
  );

  const startInternal = useCallback(
    async (overrides?: Partial<CameraSettingsState>) => {
      if (!isSupported) {
        setStatus("unsupported");
        setError({
          kind: "browser-unsupported",
          message: "Your browser doesn't support camera access.",
        });
        return;
      }

      setStatus((prev) =>
        prev === "idle" || prev === "stopped" || prev === "camera-error"
          ? "initializing"
          : "reconnecting",
      );
      setError(null);

      try {
        const constraints = buildConstraints(overrides);
        const next = await navigator.mediaDevices.getUserMedia(constraints);
        stopTracks();
        attachStream(next);
        reconnectAttemptsRef.current = 0;
        setStatus("ready");
        if (overrides) setSettings((prev) => ({ ...prev, ...overrides }));

        const track = next.getVideoTracks()[0];
        try {
          setCapabilities((track?.getCapabilities?.() as ExtendedMediaTrackCapabilities) ?? null);
        } catch {
          setCapabilities(null);
        }
        track?.addEventListener("ended", () => {
          setStatus((prev) => (prev === "stopped" || prev === "paused" ? prev : "reconnecting"));

          if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setStatus("camera-error");
            setError({
              kind: "unknown",
              message: "Lost connection to the camera and couldn't reconnect.",
            });
            return;
          }
          reconnectAttemptsRef.current += 1;
          const delay = 1000 * reconnectAttemptsRef.current;
          setTimeout(() => {
            startInternalRef.current().catch(() => undefined);
          }, delay);
        });

        await refreshDeviceList();
      } catch (err) {
        const mapped = mapCameraError(err);
        setError(mapped);
        setStatus(
          mapped.kind === "permission-denied"
            ? "permission-denied"
            : mapped.kind === "device-not-found"
              ? "device-not-found"
              : mapped.kind === "camera-busy"
                ? "camera-busy"
                : mapped.kind === "browser-unsupported"
                  ? "unsupported"
                  : "camera-error",
        );
      }
    },
    [isSupported, buildConstraints, stopTracks, attachStream, refreshDeviceList],
  );

  useEffect(() => {
    startInternalRef.current = startInternal;
  }, [startInternal]);

  const start = useCallback(() => startInternal(), [startInternal]);
  const refresh = useCallback(() => startInternal(), [startInternal]);
  const switchDevice = useCallback(
    (deviceId: string) => startInternal({ deviceId }),
    [startInternal],
  );
  const setResolution = useCallback(
    (resolution: ResolutionPreset) => startInternal({ resolution }),
    [startInternal],
  );
  const setFrameRate = useCallback(
    (frameRate: number) => startInternal({ frameRate }),
    [startInternal],
  );

  const stop = useCallback(() => {
    stopTracks();
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("stopped");
    setStats(EMPTY_STATS);
    setCapabilities(null);
  }, [stopTracks]);

  const pause = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });
    setStatus("running");
  }, []);

  const toggleMirror = useCallback(() => {
    setSettings((prev) => ({ ...prev, mirrored: !prev.mirrored }));
  }, []);

  const setAutoStart = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, autoStart: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_CAMERA_SETTINGS);
  }, []);

  const setAdjustments = useCallback((adjustments: Partial<ImageAdjustments>) => {
    setSettings((prev) => ({ ...prev, adjustments: { ...prev.adjustments, ...adjustments } }));
  }, []);

  const setAspectRatio = useCallback((aspectRatio: CameraAspectRatio) => {
    setSettings((prev) => ({ ...prev, aspectRatio }));
  }, []);

  const setGridOverlay = useCallback((gridOverlay: GridOverlayMode) => {
    setSettings((prev) => ({ ...prev, gridOverlay }));
  }, []);

  // A real exposure/contrast boost (reuses the same CSS-filter pipeline as
  // the manual sliders) — not a learned low-light model, just a brighter
  // preset applied on top of whatever the user already set manually.
  const setLowLightBoost = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, lowLightBoost: enabled }));
  }, []);

  // Real per-track hardware constraint (zoom/torch/exposure/focus) — a no-op
  // on the majority of devices that don't support a given field; callers
  // gate on `capabilities` before ever showing the control, so silently
  // swallowing an unsupported constraint here is the right behavior, not an
  // error to surface.
  const applyTrackConstraints = useCallback(
    async (constraints: ExtendedMediaTrackConstraintSet) => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      try {
        await track.applyConstraints({ advanced: [constraints] });
      } catch {
        // Unsupported on this device/browser.
      }
    },
    [],
  );

  const flipFacing = useCallback(async () => {
    const next: FacingMode = settings.facingMode === "environment" ? "user" : "environment";
    await startInternal({ facingMode: next });
  }, [settings.facingMode, startInternal]);

  const takeScreenshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (settings.mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }, [settings.mirrored]);

  // Promote "ready" -> "running" once the <video> element actually starts playing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlaying = () => setStatus((prev) => (prev === "ready" ? "running" : prev));
    video.addEventListener("playing", onPlaying);
    return () => video.removeEventListener("playing", onPlaying);
  }, [stream]);

  // FPS / resolution / uptime sampling while actively streaming.
  useEffect(() => {
    if (status !== "running" && status !== "paused") return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    frameCountRef.current = 0;
    fpsWindowStartRef.current = performance.now();
    const startedAt = Date.now();

    function tick() {
      if (cancelled) return;
      frameCountRef.current += 1;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    statsIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsedSeconds = (now - fpsWindowStartRef.current) / 1000;
      const fps = elapsedSeconds > 0 ? Math.round(frameCountRef.current / elapsedSeconds) : 0;
      frameCountRef.current = 0;
      fpsWindowStartRef.current = now;

      setStats((prev) => ({
        fps,
        width: video.videoWidth,
        height: video.videoHeight,
        frameCount: prev.frameCount + 1,
        uptimeMs: Date.now() - startedAt,
        startedAt: prev.startedAt ?? startedAt,
      }));
    }, 1000);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [status]);

  // React to devices being plugged/unplugged.
  useEffect(() => {
    if (!isSupported) return;
    const handler = () => {
      refreshDeviceList();
    };
    navigator.mediaDevices.addEventListener("devicechange", handler);
    handler();
    return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, [isSupported, refreshDeviceList]);

  // Optional auto-start on first mount. `start` only sets state inside the
  // async getUserMedia continuation, never synchronously in this effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings.autoStart) start();
    // Intentionally runs once on mount only — `autoStart` toggling later
    // should not retroactively start/stop the camera on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Release the camera when the owning component unmounts.
  useEffect(() => {
    return () => {
      stopTracks();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [stopTracks]);

  return {
    status,
    error,
    stream,
    devices,
    settings,
    stats,
    isSupported,
    videoRef,
    start,
    stop,
    pause,
    resume,
    refresh,
    switchDevice,
    setResolution,
    setFrameRate,
    toggleMirror,
    setAutoStart,
    takeScreenshot,
    resetSettings,
    setAdjustments,
    setAspectRatio,
    setGridOverlay,
    setLowLightBoost,
    capabilities,
    applyTrackConstraints,
    flipFacing,
  };
}
