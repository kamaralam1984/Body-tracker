export type CameraStatus =
  | "idle"
  | "initializing"
  | "waiting"
  | "ready"
  | "running"
  | "paused"
  | "stopped"
  | "permission-required"
  | "permission-denied"
  | "device-not-found"
  | "camera-busy"
  | "camera-error"
  | "reconnecting"
  | "unsupported";

export type CameraErrorKind =
  | "permission-denied"
  | "device-not-found"
  | "camera-busy"
  | "browser-unsupported"
  | "constraint-error"
  | "unknown";

export interface CameraError {
  kind: CameraErrorKind;
  message: string;
  original?: unknown;
}

export type ResolutionPreset = "auto" | "480p" | "720p" | "1080p" | "1440p" | "2160p";

export interface ResolutionOption {
  value: ResolutionPreset;
  label: string;
  width?: number;
  height?: number;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  groupId?: string;
}

export type FacingMode = "user" | "environment";

/** 0-100 scale, 50 = neutral/unmodified — mapped to real CSS `filter()` percentages in camera-preview.tsx. */
export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 50,
  contrast: 50,
  saturation: 50,
};

export interface CameraSettingsState {
  deviceId?: string;
  resolution: ResolutionPreset;
  frameRate: number;
  mirrored: boolean;
  autoStart: boolean;
  facingMode?: FacingMode;
  adjustments: ImageAdjustments;
}

export interface CameraStats {
  fps: number;
  width: number;
  height: number;
  frameCount: number;
  uptimeMs: number;
  startedAt: number | null;
}

// Non-standard Media Capture/Image Capture extensions (Chrome/Android only)
// that TypeScript's DOM lib doesn't declare — zoom/torch/exposure/focus are
// real, shipped browser features, just not yet part of the stable spec
// TS ships types for. Declared locally rather than widening the global lib.
export interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  zoom?: { min: number; max: number; step: number };
  torch?: boolean;
  focusMode?: string[];
  exposureMode?: string[];
}

export interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  zoom?: number;
  torch?: boolean;
  focusMode?: string;
  exposureMode?: string;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettingsState = {
  deviceId: undefined,
  resolution: "1080p",
  frameRate: 30,
  mirrored: true,
  autoStart: false,
  facingMode: undefined,
  adjustments: DEFAULT_IMAGE_ADJUSTMENTS,
};
