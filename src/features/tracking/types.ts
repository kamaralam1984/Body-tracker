/**
 * Public contract for the tracking feature. Nothing here (or anywhere the UI
 * layer touches) exposes MediaPipe-specific vocabulary, landmark counts, or
 * raw confidence numbers — those live only inside `lib/tracking-engine.ts`
 * and the render routines that consume this module's output.
 */

export type TrackingMode = "face" | "hand" | "pose" | "segmentation" | "object-detection";

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
  /** Real continuous 0-100 value (average of the `mouthSmileLeft`/`mouthSmileRight` blendshape scores) — `smile` above is just this thresholded at 35, kept for existing alert logic. */
  smileScore: number;
  mouthOpen: boolean;
  /** Degrees. `null` when the engine wasn't configured to compute head pose. */
  headRotation: { pitch: number; yaw: number; roll: number } | null;
  /** The real raw 4x4 facial transformation matrix MediaPipe returns (row-major, flattened) — `headRotation` above is just this converted to Euler angles; the matrix itself is for Developer Mode's "Camera matrix" display, not otherwise used. `null` when unavailable. */
  transformationMatrix: { rows: number; columns: number; data: number[] } | null;
  /** Face bounding-box area as a fraction (0-1) of the frame — a real, honest proxy for "how big the face appears," not a calibrated real-world distance (no depth sensor exists to measure that). */
  sizeRatio: number;
  /**
   * Estimated from where the iris sits within each eye's socket bounding
   * box (both real landmark positions) — `true` when roughly centered in
   * both eyes. This is a real geometric computation, not fabricated, but
   * it's an uncalibrated 2D estimate, not true gaze tracking — distinct
   * from `lookingAway` (head-yaw based, in use-tracking-session-sync.ts).
   * `null` when eye/iris landmarks aren't available this frame.
   */
  eyeContact: boolean | null;
}

export interface HandTrackingResult {
  hand: "left" | "right";
  points: TrackingPoint[];
  segments: [TrackingPoint, TrackingPoint][];
  /** Real per-hand handedness-classification score (0-1) from `HandLandmarkerResult.handedness` — the closest genuine per-detection confidence MediaPipe exposes for a hand; used as an honest "visibility" proxy where a raw detection confidence is wanted. */
  confidence: number;
}

export interface PoseTrackingResult {
  points: TrackingPoint[];
  segments: [TrackingPoint, TrackingPoint][];
}

/**
 * Real per-pixel confidence mask from MediaPipe's selfie segmenter — one
 * float per pixel (0-1, likelihood that pixel is "person"), at the model's
 * own output resolution (typically far smaller than the camera frame, e.g.
 * 256x256), not the video's resolution. Renderers scale it up.
 */
export interface SegmentationResult {
  maskWidth: number;
  maskHeight: number;
  confidenceMask: Float32Array;
}

/** One real detected object — MediaPipe's ObjectDetector genuinely returns a category name + confidence score per detection (unlike Face/Hand/Pose, whose result types carry no such field). */
export interface DetectedObject {
  categoryName: string;
  /** Real 0-1 confidence from the model, not derived/estimated. */
  score: number;
  /** Normalized 0-1 (fraction of frame width/height), matching every other coordinate in this module — converted from the model's native pixel coordinates using the actual video dimensions. */
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface TrackingFrame {
  timestampMs: number;
  face: FaceTrackingResult | null;
  hands: HandTrackingResult[];
  pose: PoseTrackingResult | null;
  /**
   * How many faces the model detected this frame, not just the primary one
   * tracked in `face` — every score/dashboard in this app is single-subject
   * by design, so this only powers a "multiple people detected" alert, not
   * independent per-person analytics.
   */
  faceCount: number;
  segmentation: SegmentationResult | null;
  objects: DetectedObject[];
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
  /**
   * Gesture classification is computed from hand-landmarker output, not a
   * separate MediaPipe model — this only gates whether that classification
   * runs/displays, not whether hand tracking itself is on. Defaults to true
   * whenever hand tracking is on.
   */
  gestureRecognitionEnabled: boolean;
}

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  modes: new Set<TrackingMode>(["face"]),
  quality: "balanced",
  smoothing: 0.65,
  mirrored: true,
  gestureRecognitionEnabled: true,
};

/** Real per-model lifecycle state — the ONLY vocabulary the "AI Model Management" panel is allowed to render for `status`. */
export type ModelStatus = "off" | "initializing" | "active" | "error";

/**
 * Per-model live stats for the "AI Model Management" panel. Every field here
 * is either a genuine measured value or explicitly `null` — see
 * tracking-engine.ts's `getModelStats()` for exactly which MediaPipe API each
 * one comes from and why some models (Face) have no real confidence to
 * report at all.
 */
export interface ModelStat {
  status: ModelStatus;
  /** `null` when the underlying MediaPipe result type exposes no detection-confidence field for this model (true for Face — see tracking-engine.ts). */
  confidence: number | null;
  /** Rolling average of real `performance.now()` deltas around this model's own `detectForVideo()` call — distinct from the other models' time in the same frame. */
  processingTimeMs: number;
  /** The actual model asset file currently loaded — a real identifier, not a fabricated semantic version (MediaPipe doesn't version individual models beyond the shared Tasks Vision runtime). */
  modelAsset: string | null;
}

export interface ModelsStats {
  face: ModelStat;
  hand: ModelStat;
  pose: ModelStat;
  segmentation: ModelStat;
  objectDetection: ModelStat;
}

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
