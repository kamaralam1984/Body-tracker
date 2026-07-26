/**
 * Core tracking engine — owns the MediaPipe Tasks Vision landmarkers, runs
 * detection against a video frame, and turns raw results into the
 * abstracted `TrackingFrame` shape the rest of the app consumes. No React
 * here; `hooks/use-body-tracking.ts` drives this with a render loop.
 *
 * MediaPipe is loaded lazily (dynamic `import()`) so it never touches SSR
 * and the ~large WASM runtime only downloads once tracking actually starts.
 */

import type {
  Category,
  FaceLandmarker,
  FaceLandmarkerResult,
  HandLandmarker,
  HandLandmarkerResult,
  ImageSegmenter,
  ImageSegmenterResult,
  Matrix,
  NormalizedLandmark,
  ObjectDetector,
  ObjectDetectorResult,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { LandmarkSmoother } from "./one-euro-filter";
import {
  DEFAULT_TRACKING_CONFIG,
  FACE_CONTOUR_NAMES,
  type DetectedObject,
  type FaceContour,
  type FaceContourName,
  type FaceTrackingResult,
  type HandTrackingResult,
  type ModelStat,
  type ModelsStats,
  type PoseTrackingResult,
  type SegmentationResult,
  type TrackingConfig,
  type TrackingFrame,
  type TrackingPoint,
  type TrackingStatus,
} from "../types";

// `Connection` isn't part of the package's public type exports, so this
// mirrors its shape locally — TypeScript matches it structurally against
// the real `FaceLandmarker.FACE_LANDMARKS_*` / `*_CONNECTIONS` arrays.
interface Connection {
  start: number;
  end: number;
}

type VisionModule = typeof import("@mediapipe/tasks-vision");
type FaceLandmarkerInstance = FaceLandmarker;
type HandLandmarkerInstance = HandLandmarker;
type PoseLandmarkerInstance = PoseLandmarker;
type ImageSegmenterInstance = ImageSegmenter;
type ObjectDetectorInstance = ObjectDetector;
type WasmFileset = Awaited<ReturnType<VisionModule["FilesetResolver"]["forVisionTasks"]>>;

const MEDIAPIPE_VERSION = "0.10.35"; // keep in sync with the installed @mediapipe/tasks-vision version
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;

const MODEL_URLS = {
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  pose: {
    fast: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    balanced:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
    accurate:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
  },
  // Both verified reachable directly (curl) before wiring in — unlike the
  // three landmarkers above, MediaPipe ships these two as bare `.tflite`
  // files rather than the bundled `.task` format.
  segmentation:
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
  objectDetection:
    "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite",
} as const;

// Detection/presence/tracking confidence floor for all three landmarkers.
// MediaPipe's own default (0.5) is permissive enough to lock onto
// non-face/hand/pose shapes (glasses, wall patterns, reflections) and keep
// drawing an overlay when nothing is actually there. Raising this makes the
// engine correctly report "nothing detected" — the canvas already skips
// drawing entirely when a mode's result is null (see tracking-canvas.tsx) —
// so a higher floor directly fixes both false-positive lines and jitter,
// since low-confidence, noisy candidate detections get rejected up front.
const MIN_CONFIDENCE = 0.65;

// Bounds how many objects a single frame ever reports — a real cap on the
// model's own `maxResults` option, not post-hoc truncation, so it also
// bounds inference cost per frame.
const OBJECT_DETECTION_MAX_RESULTS = 10;

// Cap on how many faces the model will report at all (see numFaces below) —
// only used to derive `faceCount` for the "multiple people detected" alert.
const MAX_DETECTABLE_FACES = 4;

// MediaPipe Pose landmark indices 0–10 (nose, left/right eye inner-center-outer,
// left/right ear, mouth left/right) — see processPose below for why these get
// excluded from what's actually drawn.
const POSE_FACE_LANDMARK_COUNT = 11;

// Status hysteresis thresholds, in consecutive detection frames (~30fps).
const EXCELLENT_HIT_STREAK = 45; // ~1.5s of sustained, uninterrupted detection
const GOOD_HIT_STREAK = 10; // ~0.3s
const LOST_MISS_STREAK = 30; // ~1s of nothing found before we call it "lost"
const MAX_REINIT_ATTEMPTS = 3;

let visionModulePromise: Promise<VisionModule> | null = null;
function loadVisionModule(): Promise<VisionModule> {
  if (!visionModulePromise) {
    visionModulePromise = import("@mediapipe/tasks-vision");
  }
  return visionModulePromise;
}

function toTrackingPoint(landmark: NormalizedLandmark): TrackingPoint {
  return { x: landmark.x, y: landmark.y, z: landmark.z, visibility: landmark.visibility };
}

function segmentsFromConnections(
  points: TrackingPoint[],
  connections: Connection[],
): [TrackingPoint, TrackingPoint][] {
  const segments: [TrackingPoint, TrackingPoint][] = [];
  for (const { start, end } of connections) {
    const a = points[start];
    const b = points[end];
    if (a && b) segments.push([a, b]);
  }
  return segments;
}

function getCategoryScore(categories: Category[], name: string): number {
  return categories.find((c) => c.categoryName === name)?.score ?? 0;
}

/** Bounding box (0-1 normalized) of a set of points — used for both face size and eye-socket extent below. */
function boundsOfPoints(
  points: TrackingPoint[],
  indices: Iterable<number>,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const index of indices) {
    const p = points[index];
    if (!p) continue;
    found = true;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return found ? { minX, minY, maxX, maxY } : null;
}

function centroidOf(points: TrackingPoint[], indices: Iterable<number>): TrackingPoint | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const index of indices) {
    const p = points[index];
    if (!p) continue;
    sumX += p.x;
    sumY += p.y;
    count += 1;
  }
  return count > 0 ? { x: sumX / count, y: sumY / count } : null;
}

function uniqueIndices(connections: Connection[]): Set<number> {
  const out = new Set<number>();
  for (const { start, end } of connections) {
    out.add(start);
    out.add(end);
  }
  return out;
}

/**
 * Real geometric gaze estimate: where the iris centroid sits within its own
 * eye socket's bounding box, normalized so 0 = dead center. Averaged across
 * both eyes and thresholded — an honest 2D proxy from real landmark
 * positions, not calibrated gaze tracking (no eye-tracking hardware here).
 */
function estimateEyeContact(
  points: TrackingPoint[],
  leftEye: Connection[],
  rightEye: Connection[],
  leftIris: Connection[],
  rightIris: Connection[],
): boolean | null {
  const offsets: { dx: number; dy: number }[] = [];
  for (const [eye, iris] of [
    [leftEye, leftIris],
    [rightEye, rightIris],
  ] as const) {
    const socket = boundsOfPoints(points, uniqueIndices(eye));
    const irisCenter = centroidOf(points, uniqueIndices(iris));
    if (!socket || !irisCenter) continue;
    const width = socket.maxX - socket.minX || 1e-6;
    const height = socket.maxY - socket.minY || 1e-6;
    const cx = (socket.minX + socket.maxX) / 2;
    const cy = (socket.minY + socket.maxY) / 2;
    offsets.push({ dx: (irisCenter.x - cx) / width, dy: (irisCenter.y - cy) / height });
  }
  if (offsets.length === 0) return null;
  const avgDx = offsets.reduce((sum, o) => sum + o.dx, 0) / offsets.length;
  const avgDy = offsets.reduce((sum, o) => sum + o.dy, 0) / offsets.length;
  // Eyes are wider than tall, so the horizontal tolerance is looser.
  return Math.abs(avgDx) < 0.2 && Math.abs(avgDy) < 0.3;
}

/** Just the filename off a model asset URL — a real identifier for the "AI Model Management" panel's Version/Model column, not a fabricated semantic version. */
function assetFilename(url: string): string {
  return url.split("/").pop() ?? url;
}

/** Extracts pitch/yaw/roll (degrees) from a 4x4 row-major rotation+translation matrix. */
function extractEulerAnglesDeg(matrix: Matrix): { pitch: number; yaw: number; roll: number } {
  const { data, columns } = matrix;
  const at = (row: number, col: number) => data[row * columns + col] ?? 0;

  const m00 = at(0, 0);
  const m10 = at(1, 0);
  const m20 = at(2, 0);
  const m21 = at(2, 1);
  const m22 = at(2, 2);

  const sy = Math.sqrt(m00 * m00 + m10 * m10);
  const singular = sy < 1e-6;

  let x: number;
  let y: number;
  let z: number;
  if (!singular) {
    x = Math.atan2(m21, m22);
    y = Math.atan2(-m20, sy);
    z = Math.atan2(m10, m00);
  } else {
    x = Math.atan2(-at(1, 2), at(1, 1));
    y = Math.atan2(-m20, sy);
    z = 0;
  }

  const toDeg = (radians: number) => (radians * 180) / Math.PI;
  return { pitch: toDeg(x), yaw: toDeg(y), roll: toDeg(z) };
}

export class TrackingEngine {
  private vision: VisionModule | null = null;
  private fileset: WasmFileset | null = null;

  private faceLandmarker: FaceLandmarkerInstance | null = null;
  private handLandmarker: HandLandmarkerInstance | null = null;
  private poseLandmarker: PoseLandmarkerInstance | null = null;
  private imageSegmenter: ImageSegmenterInstance | null = null;
  private objectDetector: ObjectDetectorInstance | null = null;

  private faceContourConnections: Record<FaceContourName, Connection[]> | null = null;
  private handConnections: Connection[] = [];
  private poseConnections: Connection[] = [];

  private config: TrackingConfig;
  private faceSmoother: LandmarkSmoother;
  private handSmoother: LandmarkSmoother;
  private poseSmoother: LandmarkSmoother;

  private hitStreak = 0;
  private missStreak = 0;
  private statusOverride: "reconnecting" | "error" | "unsupported" | null = null;
  private reinitAttempts = 0;

  // Per-model stats for the "AI Model Management" panel — see getModelStats().
  // `confidence` stays `null` for Face: FaceLandmarkerResult exposes no
  // detection-confidence field at all (only per-expression blendshape
  // scores), so there is genuinely nothing real to report there.
  private faceProcessingMs = 0;
  private handProcessingMs = 0;
  private poseProcessingMs = 0;
  private segmentationProcessingMs = 0;
  private objectDetectionProcessingMs = 0;
  private handConfidence: number | null = null;
  private poseConfidence: number | null = null;
  // Real average of ImageSegmenter's own `qualityScores` (per-category
  // confidence) — pose's average-visibility, hand's average handedness
  // score, and this all follow the same "average whatever real per-frame
  // confidence signal the model actually returns" pattern.
  private segmentationConfidence: number | null = null;
  // Real average of every currently-detected object's own score — `null`
  // when nothing is detected this frame, never a fabricated 0.
  private objectDetectionConfidence: number | null = null;

  constructor(config: TrackingConfig = DEFAULT_TRACKING_CONFIG) {
    this.config = config;
    this.faceSmoother = new LandmarkSmoother(config.smoothing);
    this.handSmoother = new LandmarkSmoother(config.smoothing);
    this.poseSmoother = new LandmarkSmoother(config.smoothing);
  }

  async initialize(): Promise<void> {
    if (typeof WebAssembly === "undefined") {
      this.statusOverride = "unsupported";
      throw new Error("WebAssembly is not available in this browser");
    }

    try {
      const vision = await loadVisionModule();
      this.vision = vision;
      this.fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE_URL);
      this.faceContourConnections = {
        faceOval: vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        leftEye: vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        rightEye: vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        leftEyebrow: vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        rightEyebrow: vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        leftIris: vision.FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        rightIris: vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        lips: vision.FaceLandmarker.FACE_LANDMARKS_LIPS,
      };
      this.handConnections = vision.HandLandmarker.HAND_CONNECTIONS;
      this.poseConnections = vision.PoseLandmarker.POSE_CONNECTIONS;

      await this.syncLandmarkers();
    } catch (error) {
      this.statusOverride = "error";
      throw error;
    }
  }

  private async syncLandmarkers(): Promise<void> {
    if (!this.vision || !this.fileset) return;
    const { modes, quality } = this.config;

    if (modes.has("face") && !this.faceLandmarker) {
      this.faceLandmarker = await this.vision.FaceLandmarker.createFromOptions(this.fileset, {
        baseOptions: { modelAssetPath: MODEL_URLS.face, delegate: "GPU" },
        runningMode: "VIDEO",
        // >1 so a real faceCount (see detectFrame) can drive a "multiple
        // people detected" alert — every score/dashboard in this app still
        // only ever tracks a single primary (largest) face, by design.
        numFaces: MAX_DETECTABLE_FACES,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: MIN_CONFIDENCE,
        minFacePresenceConfidence: MIN_CONFIDENCE,
        minTrackingConfidence: MIN_CONFIDENCE,
      });
    } else if (!modes.has("face") && this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
      this.faceSmoother.reset();
    }

    if (modes.has("hand") && !this.handLandmarker) {
      this.handLandmarker = await this.vision.HandLandmarker.createFromOptions(this.fileset, {
        baseOptions: { modelAssetPath: MODEL_URLS.hand, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: MIN_CONFIDENCE,
        minHandPresenceConfidence: MIN_CONFIDENCE,
        minTrackingConfidence: MIN_CONFIDENCE,
      });
    } else if (!modes.has("hand") && this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
      this.handSmoother.reset();
    }

    if (modes.has("pose") && !this.poseLandmarker) {
      this.poseLandmarker = await this.vision.PoseLandmarker.createFromOptions(this.fileset, {
        baseOptions: { modelAssetPath: MODEL_URLS.pose[quality], delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        outputSegmentationMasks: false,
        minPoseDetectionConfidence: MIN_CONFIDENCE,
        minPosePresenceConfidence: MIN_CONFIDENCE,
        minTrackingConfidence: MIN_CONFIDENCE,
      });
    } else if (!modes.has("pose") && this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
      this.poseSmoother.reset();
    }

    if (modes.has("segmentation") && !this.imageSegmenter) {
      this.imageSegmenter = await this.vision.ImageSegmenter.createFromOptions(this.fileset, {
        baseOptions: { modelAssetPath: MODEL_URLS.segmentation, delegate: "GPU" },
        runningMode: "VIDEO",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    } else if (!modes.has("segmentation") && this.imageSegmenter) {
      this.imageSegmenter.close();
      this.imageSegmenter = null;
    }

    if (modes.has("object-detection") && !this.objectDetector) {
      this.objectDetector = await this.vision.ObjectDetector.createFromOptions(this.fileset, {
        baseOptions: { modelAssetPath: MODEL_URLS.objectDetection, delegate: "GPU" },
        runningMode: "VIDEO",
        scoreThreshold: MIN_CONFIDENCE,
        maxResults: OBJECT_DETECTION_MAX_RESULTS,
      });
    } else if (!modes.has("object-detection") && this.objectDetector) {
      this.objectDetector.close();
      this.objectDetector = null;
    }
  }

  async updateConfig(next: Partial<TrackingConfig>): Promise<void> {
    const qualityChanged = next.quality !== undefined && next.quality !== this.config.quality;
    this.config = { ...this.config, ...next };

    if (next.smoothing !== undefined) {
      this.faceSmoother.setSmoothing(next.smoothing);
      this.handSmoother.setSmoothing(next.smoothing);
      this.poseSmoother.setSmoothing(next.smoothing);
    }

    if (qualityChanged && this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }

    if (this.vision) await this.syncLandmarkers();
  }

  isReady(): boolean {
    return this.vision !== null;
  }

  /** Runs detection for every enabled mode against the current video frame. */
  detectFrame(video: HTMLVideoElement, timestampMs: number): TrackingFrame {
    let face: FaceTrackingResult | null = null;
    let hands: HandTrackingResult[] = [];
    let pose: PoseTrackingResult | null = null;
    let faceCount = 0;
    let segmentation: SegmentationResult | null = null;
    let objects: DetectedObject[] = [];
    let anyEnabled = false;
    let anyDetected = false;

    try {
      if (this.faceLandmarker) {
        anyEnabled = true;
        const start = performance.now();
        const result = this.faceLandmarker.detectForVideo(video, timestampMs);
        this.faceProcessingMs = performance.now() - start;
        face = this.processFace(result, timestampMs);
        faceCount = result.faceLandmarks.length;
        if (face) anyDetected = true;
      }
      if (this.handLandmarker) {
        anyEnabled = true;
        const start = performance.now();
        const result = this.handLandmarker.detectForVideo(video, timestampMs);
        this.handProcessingMs = performance.now() - start;
        // Real per-hand classification confidence (Left/Right vs. that
        // handedness's alternative) — the closest genuine per-detection
        // score MediaPipe's HandLandmarkerResult exposes; averaged across
        // however many hands are actually present this frame.
        const handednessScores = result.handedness
          .map((categories) => categories[0]?.score)
          .filter((score): score is number => score !== undefined);
        this.handConfidence =
          handednessScores.length > 0
            ? handednessScores.reduce((sum, s) => sum + s, 0) / handednessScores.length
            : null;
        hands = this.processHands(result, timestampMs);
        if (hands.length > 0) anyDetected = true;
      }
      if (this.poseLandmarker) {
        anyEnabled = true;
        const start = performance.now();
        const result = this.poseLandmarker.detectForVideo(
          video,
          timestampMs,
        ) as PoseLandmarkerResult;
        this.poseProcessingMs = performance.now() - start;
        // Real per-point visibility, averaged — pose is the only one of the
        // three landmarkers that actually populates this field.
        const points = result.landmarks[0];
        this.poseConfidence = points?.length
          ? points.reduce((sum, p) => sum + p.visibility, 0) / points.length
          : null;
        pose = this.processPose(result, timestampMs);
        if (pose) anyDetected = true;
      }
      if (this.imageSegmenter) {
        anyEnabled = true;
        const start = performance.now();
        const result = this.imageSegmenter.segmentForVideo(video, timestampMs);
        this.segmentationProcessingMs = performance.now() - start;
        this.segmentationConfidence = result.qualityScores?.[0] ?? null;
        segmentation = this.processSegmentation(result);
        result.close();
        if (segmentation) anyDetected = true;
      }
      if (this.objectDetector) {
        anyEnabled = true;
        const start = performance.now();
        const result = this.objectDetector.detectForVideo(video, timestampMs);
        this.objectDetectionProcessingMs = performance.now() - start;
        objects = this.processObjectDetection(result, video.videoWidth, video.videoHeight);
        this.objectDetectionConfidence =
          objects.length > 0 ? objects.reduce((sum, o) => sum + o.score, 0) / objects.length : null;
        if (objects.length > 0) anyDetected = true;
      }
      this.statusOverride = null;
      this.reinitAttempts = 0;
    } catch {
      this.handleDetectionError();
    }

    this.faceSmoother.endFrame();
    this.handSmoother.endFrame();
    this.poseSmoother.endFrame();

    if (anyEnabled) {
      if (anyDetected) {
        this.hitStreak += 1;
        this.missStreak = 0;
      } else {
        this.missStreak += 1;
        this.hitStreak = 0;
      }
    }

    return { timestampMs, face, hands, pose, faceCount, segmentation, objects };
  }

  private handleDetectionError(): void {
    if (this.reinitAttempts >= MAX_REINIT_ATTEMPTS) {
      this.statusOverride = "error";
      return;
    }
    this.statusOverride = "reconnecting";
    this.reinitAttempts += 1;
    this.faceLandmarker?.close();
    this.handLandmarker?.close();
    this.poseLandmarker?.close();
    this.imageSegmenter?.close();
    this.objectDetector?.close();
    this.faceLandmarker = null;
    this.handLandmarker = null;
    this.poseLandmarker = null;
    this.imageSegmenter = null;
    this.objectDetector = null;
    void this.syncLandmarkers();
  }

  /** Manual "try again" after an unrecoverable error — resets the retry budget and re-attempts init. */
  async retry(): Promise<void> {
    this.reinitAttempts = 0;
    this.statusOverride = null;
    this.hitStreak = 0;
    this.missStreak = 0;
    try {
      if (!this.vision) {
        await this.initialize();
      } else {
        await this.syncLandmarkers();
      }
    } catch {
      this.statusOverride = "error";
    }
  }

  /** Real per-model stats for the "AI Model Management" panel — see the field-level doc comments on `ModelStat` in types.ts for exactly what's genuine vs. `null`-because-unavailable. */
  getModelStats(): ModelsStats {
    const engineError = this.statusOverride === "error" || this.statusOverride === "unsupported";

    function statOf(
      enabled: boolean,
      ready: boolean,
      processingMs: number,
      confidence: number | null,
      modelAsset: string | null,
    ): ModelStat {
      const status: ModelStat["status"] = !enabled
        ? "off"
        : engineError
          ? "error"
          : !ready
            ? "initializing"
            : "active";
      return {
        status,
        confidence: status === "active" ? confidence : null,
        processingTimeMs: status === "active" ? processingMs : 0,
        modelAsset,
      };
    }

    return {
      face: statOf(
        this.config.modes.has("face"),
        this.faceLandmarker !== null,
        this.faceProcessingMs,
        null, // FaceLandmarkerResult exposes no detection-confidence field — see the field comment above.
        this.faceLandmarker ? assetFilename(MODEL_URLS.face) : null,
      ),
      hand: statOf(
        this.config.modes.has("hand"),
        this.handLandmarker !== null,
        this.handProcessingMs,
        this.handConfidence,
        this.handLandmarker ? assetFilename(MODEL_URLS.hand) : null,
      ),
      pose: statOf(
        this.config.modes.has("pose"),
        this.poseLandmarker !== null,
        this.poseProcessingMs,
        this.poseConfidence,
        this.poseLandmarker ? assetFilename(MODEL_URLS.pose[this.config.quality]) : null,
      ),
      segmentation: statOf(
        this.config.modes.has("segmentation"),
        this.imageSegmenter !== null,
        this.segmentationProcessingMs,
        this.segmentationConfidence,
        this.imageSegmenter ? assetFilename(MODEL_URLS.segmentation) : null,
      ),
      objectDetection: statOf(
        this.config.modes.has("object-detection"),
        this.objectDetector !== null,
        this.objectDetectionProcessingMs,
        this.objectDetectionConfidence,
        this.objectDetector ? assetFilename(MODEL_URLS.objectDetection) : null,
      ),
    };
  }

  getStatus(): TrackingStatus {
    if (this.statusOverride) return this.statusOverride;
    if (this.config.modes.size === 0) return "idle";
    if (!this.vision) return "initializing";
    if (this.missStreak >= LOST_MISS_STREAK) return "lost";
    if (this.hitStreak >= EXCELLENT_HIT_STREAK) return "excellent";
    if (this.hitStreak >= GOOD_HIT_STREAK) return "good";
    if (this.hitStreak > 0) return "limited";
    return "searching";
  }

  dispose(): void {
    this.faceLandmarker?.close();
    this.handLandmarker?.close();
    this.poseLandmarker?.close();
    this.imageSegmenter?.close();
    this.objectDetector?.close();
    this.faceLandmarker = null;
    this.handLandmarker = null;
    this.poseLandmarker = null;
    this.imageSegmenter = null;
    this.objectDetector = null;
    this.faceSmoother.reset();
    this.handSmoother.reset();
    this.poseSmoother.reset();
  }

  /**
   * Index of the primary face to actually track/score when more than one is
   * detected — the largest (closest-to-camera) bounding box, not just
   * whichever the model happens to return first. Every downstream score is
   * single-subject by design; this is the one place multi-face results get
   * collapsed to one. Returns the INDEX (not the landmarks themselves) so
   * `processFace` can consistently pull the matching blendshapes/
   * transformation-matrix entries — those are parallel arrays keyed by the
   * same per-face index in MediaPipe's result.
   */
  private pickPrimaryFaceIndex(faceLandmarks: NormalizedLandmark[][]): number {
    if (faceLandmarks.length <= 1) return 0;
    let bestIndex = 0;
    let largestArea = -1;
    faceLandmarks.forEach((landmarks, index) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of landmarks) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const area = (maxX - minX) * (maxY - minY);
      if (area > largestArea) {
        largestArea = area;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  private processFace(result: FaceLandmarkerResult, t: number): FaceTrackingResult | null {
    const primaryIndex = this.pickPrimaryFaceIndex(result.faceLandmarks);
    const landmarks = result.faceLandmarks[primaryIndex];
    if (!landmarks || landmarks.length === 0 || !this.faceContourConnections) return null;

    const smoothed = this.faceSmoother.smoothPoints("face", t, landmarks.map(toTrackingPoint));

    const contours: FaceContour[] = FACE_CONTOUR_NAMES.map((name) => ({
      name,
      segments: segmentsFromConnections(smoothed, this.faceContourConnections![name]),
    }));

    const blendshapes = result.faceBlendshapes[primaryIndex]?.categories ?? [];
    const blink = {
      left: getCategoryScore(blendshapes, "eyeBlinkLeft") > 0.5,
      right: getCategoryScore(blendshapes, "eyeBlinkRight") > 0.5,
    };
    const smileScore =
      ((getCategoryScore(blendshapes, "mouthSmileLeft") +
        getCategoryScore(blendshapes, "mouthSmileRight")) /
        2) *
      100;
    const smile = smileScore > 35;
    const mouthOpen = getCategoryScore(blendshapes, "jawOpen") > 0.3;

    const matrix = result.facialTransformationMatrixes?.[primaryIndex];
    const headRotation = matrix ? extractEulerAnglesDeg(matrix) : null;

    const faceBounds = boundsOfPoints(smoothed, smoothed.keys());
    const sizeRatio = faceBounds
      ? (faceBounds.maxX - faceBounds.minX) * (faceBounds.maxY - faceBounds.minY)
      : 0;

    const eyeContact = this.faceContourConnections
      ? estimateEyeContact(
          smoothed,
          this.faceContourConnections.leftEye,
          this.faceContourConnections.rightEye,
          this.faceContourConnections.leftIris,
          this.faceContourConnections.rightIris,
        )
      : null;

    return {
      points: smoothed,
      contours,
      blink,
      smile,
      smileScore,
      mouthOpen,
      headRotation,
      sizeRatio,
      eyeContact,
    };
  }

  private processHands(result: HandLandmarkerResult, t: number): HandTrackingResult[] {
    const out: HandTrackingResult[] = [];
    result.landmarks.forEach((landmarks, index) => {
      const category = result.handedness[index]?.[0];
      // MediaPipe reports handedness from the camera's (unmirrored) point of
      // view; flip it so the label matches what the user sees in a mirrored
      // preview, which is how this app displays the camera by default.
      const rawIsLeft = category?.categoryName === "Left";
      const hand: "left" | "right" = this.config.mirrored
        ? rawIsLeft
          ? "right"
          : "left"
        : rawIsLeft
          ? "left"
          : "right";

      const smoothed = this.handSmoother.smoothPoints(
        `hand:${index}`,
        t,
        landmarks.map(toTrackingPoint),
      );
      out.push({
        hand,
        points: smoothed,
        segments: segmentsFromConnections(smoothed, this.handConnections),
        confidence: category?.score ?? 0,
      });
    });
    return out;
  }

  private processPose(result: PoseLandmarkerResult, t: number): PoseTrackingResult | null {
    const landmarks = result.landmarks[0];
    if (!landmarks || landmarks.length === 0) return null;
    const smoothed = this.poseSmoother.smoothPoints("pose", t, landmarks.map(toTrackingPoint));

    // MediaPipe Pose's own landmarks 0–10 (nose, eyes, ears, mouth corners)
    // are a crude few-point approximation of the face — connected with
    // straight lines they render as a jagged triangle over the eyes/nose,
    // not an eye outline. The dedicated "face" mode already draws a dense,
    // accurate mesh for this region, so zero these landmarks' visibility;
    // the renderer's visibility gate (draw-pose.ts) then skips them and
    // only draws body joints (shoulders down), regardless of whether face
    // mode is also on.
    for (let i = 0; i < POSE_FACE_LANDMARK_COUNT && i < smoothed.length; i++) {
      smoothed[i] = { ...smoothed[i]!, visibility: 0 };
    }

    return { points: smoothed, segments: segmentsFromConnections(smoothed, this.poseConnections) };
  }

  /** Copies the real per-pixel confidence mask out to a plain Float32Array (the MPMask itself gets `.close()`d by the caller right after, per MediaPipe's own lifetime rules) so it safely outlives this frame. */
  private processSegmentation(result: ImageSegmenterResult): SegmentationResult | null {
    const mask = result.confidenceMasks?.[0];
    if (!mask) return null;
    return {
      maskWidth: mask.width,
      maskHeight: mask.height,
      confidenceMask: new Float32Array(mask.getAsFloat32Array()),
    };
  }

  /** Converts MediaPipe's native pixel-coordinate bounding boxes to this module's 0-1 normalized convention, using the actual video frame dimensions. */
  private processObjectDetection(
    result: ObjectDetectorResult,
    videoWidth: number,
    videoHeight: number,
  ): DetectedObject[] {
    if (!videoWidth || !videoHeight) return [];
    const out: DetectedObject[] = [];
    for (const detection of result.detections) {
      const box = detection.boundingBox;
      const category = detection.categories[0];
      if (!box || !category) continue;
      out.push({
        categoryName: category.categoryName || "Object",
        score: category.score,
        boundingBox: {
          x: box.originX / videoWidth,
          y: box.originY / videoHeight,
          width: box.width / videoWidth,
          height: box.height / videoHeight,
        },
      });
    }
    return out;
  }
}

export { MODEL_URLS as TRACKING_MODEL_URLS };
