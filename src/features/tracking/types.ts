/**
 * Public contract for the tracking feature. Nothing here (or anywhere the UI
 * layer touches) exposes MediaPipe-specific vocabulary, landmark counts, or
 * raw confidence numbers — those live only inside `lib/tracking-engine.ts`
 * and the render routines that consume this module's output.
 */

export type TrackingMode = "face" | "hand" | "pose";

/**
 * User-facing tracking quality/lifecycle. This is the ONLY vocabulary the UI
 * is allowed to render — no percentages, no raw scores.
 */
export type TrackingStatus =
  | "idle"
  | "initializing"
  | "searching"
  | "excellent"
  | "good"
  | "limited"
  | "lost"
  | "reconnecting"
  | "error"
  | "unsupported";

export interface TrackingPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type FaceContourName =
  | "faceOval"
  | "leftEye"
  | "rightEye"
  | "leftEyebrow"
  | "rightEyebrow"
  | "lips"
  | "leftIris"
  | "rightIris";

export interface FaceContour {
  name: FaceContourName;
  /** Line segments (not necessarily an ordered polyline) tracing this feature. */
  segments: [TrackingPoint, TrackingPoint][];
}

export interface FaceTrackingResult {
  points: TrackingPoint[];
  contours: FaceContour[];
  blink: { left: boolean; right: boolean };
  smile: boolean;
  mouthOpen: boolean;
  /** Degrees. `null` when the engine wasn't configured to compute head pose. */
  headRotation: { pitch: number; yaw: number; roll: number } | null;
}

export interface HandTrackingResult {
  hand: "left" | "right";
  points: TrackingPoint[];
  segments: [TrackingPoint, TrackingPoint][];
}

export interface PoseTrackingResult {
  points: TrackingPoint[];
  segments: [TrackingPoint, TrackingPoint][];
}

export interface TrackingFrame {
  timestampMs: number;
  face: FaceTrackingResult | null;
  hands: HandTrackingResult[];
  pose: PoseTrackingResult | null;
}

export interface TrackingConfig {
  modes: Set<TrackingMode>;
  /** Trade detection fidelity for CPU/GPU cost. Defaults to "balanced". */
  quality: "fast" | "balanced" | "accurate";
  /** How aggressively temporal smoothing removes jitter, 0 (none) – 1 (max). Defaults to 0.5. */
  smoothing: number;
  /**
   * Whether the preview this engine analyzes is displayed mirrored. Detection
   * always runs on the raw, unmirrored camera frame; this only affects the
   * left/right hand label so it matches what the user sees in the mirror.
   */
  mirrored: boolean;
}

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  modes: new Set<TrackingMode>(["face"]),
  quality: "balanced",
  smoothing: 0.65,
  mirrored: true,
};

/** Face landmark connection groups, keyed the same as `FaceContourName`, for renderers to draw. */
export const FACE_CONTOUR_NAMES: FaceContourName[] = [
  "faceOval",
  "leftEyebrow",
  "rightEyebrow",
  "leftEye",
  "rightEye",
  "leftIris",
  "rightIris",
  "lips",
];
