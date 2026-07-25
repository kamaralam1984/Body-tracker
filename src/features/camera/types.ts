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

export interface CameraSettingsState {
  deviceId?: string;
  resolution: ResolutionPreset;
  frameRate: number;
  mirrored: boolean;
  autoStart: boolean;
}

export interface CameraStats {
  fps: number;
  width: number;
  height: number;
  frameCount: number;
  uptimeMs: number;
  startedAt: number | null;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettingsState = {
  deviceId: undefined,
  resolution: "1080p",
  frameRate: 30,
  mirrored: true,
  autoStart: false,
};
