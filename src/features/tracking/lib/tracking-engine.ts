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
  Matrix,
  NormalizedLandmark,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { LandmarkSmoother } from "./one-euro-filter";
import {
  DEFAULT_TRACKING_CONFIG,
  FACE_CONTOUR_NAMES,
  type FaceContour,
  type FaceContourName,
  type FaceTrackingResult,
  type HandTrackingResult,
  type PoseTrackingResult,
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
} as const;

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
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
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
      });
    } else if (!modes.has("pose") && this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
      this.poseSmoother.reset();
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
    let anyEnabled = false;
    let anyDetected = false;

    try {
      if (this.faceLandmarker) {
        anyEnabled = true;
        const result = this.faceLandmarker.detectForVideo(video, timestampMs);
        face = this.processFace(result, timestampMs);
        if (face) anyDetected = true;
      }
      if (this.handLandmarker) {
        anyEnabled = true;
        const result = this.handLandmarker.detectForVideo(video, timestampMs);
        hands = this.processHands(result, timestampMs);
        if (hands.length > 0) anyDetected = true;
      }
      if (this.poseLandmarker) {
        anyEnabled = true;
        const result = this.poseLandmarker.detectForVideo(
          video,
          timestampMs,
        ) as PoseLandmarkerResult;
        pose = this.processPose(result, timestampMs);
        if (pose) anyDetected = true;
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

    return { timestampMs, face, hands, pose };
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
    this.faceLandmarker = null;
    this.handLandmarker = null;
    this.poseLandmarker = null;
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
    this.faceLandmarker = null;
    this.handLandmarker = null;
    this.poseLandmarker = null;
    this.faceSmoother.reset();
    this.handSmoother.reset();
    this.poseSmoother.reset();
  }

  private processFace(result: FaceLandmarkerResult, t: number): FaceTrackingResult | null {
    const landmarks = result.faceLandmarks[0];
    if (!landmarks || landmarks.length === 0 || !this.faceContourConnections) return null;

    const smoothed = this.faceSmoother.smoothPoints("face", t, landmarks.map(toTrackingPoint));

    const contours: FaceContour[] = FACE_CONTOUR_NAMES.map((name) => ({
      name,
      segments: segmentsFromConnections(smoothed, this.faceContourConnections![name]),
    }));

    const blendshapes = result.faceBlendshapes[0]?.categories ?? [];
    const blink = {
      left: getCategoryScore(blendshapes, "eyeBlinkLeft") > 0.5,
      right: getCategoryScore(blendshapes, "eyeBlinkRight") > 0.5,
    };
    const smile =
      (getCategoryScore(blendshapes, "mouthSmileLeft") +
        getCategoryScore(blendshapes, "mouthSmileRight")) /
        2 >
      0.35;
    const mouthOpen = getCategoryScore(blendshapes, "jawOpen") > 0.3;

    const matrix = result.facialTransformationMatrixes?.[0];
    const headRotation = matrix ? extractEulerAnglesDeg(matrix) : null;

    return { points: smoothed, contours, blink, smile, mouthOpen, headRotation };
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
      });
    });
    return out;
  }

  private processPose(result: PoseLandmarkerResult, t: number): PoseTrackingResult | null {
    const landmarks = result.landmarks[0];
    if (!landmarks || landmarks.length === 0) return null;
    const smoothed = this.poseSmoother.smoothPoints("pose", t, landmarks.map(toTrackingPoint));
    return { points: smoothed, segments: segmentsFromConnections(smoothed, this.poseConnections) };
  }
}

export { MODEL_URLS as TRACKING_MODEL_URLS };
