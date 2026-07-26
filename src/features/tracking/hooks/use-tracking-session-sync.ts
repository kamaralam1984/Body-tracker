"use client";

/**
 * Bridges live face/hand/pose-tracking to the real backend: while `active`,
 * creates and starts a `TrackingSession`, tallies aggregate stats from every
 * detected frame (never raw landmarks — see the flush body below for
 * exactly what leaves the browser), flushes a window to
 * `POST /api/v1/tracking/[sessionId]/metrics` every ~10s, and stops the
 * session when tracking ends. This is what makes the Attention/Posture/
 * Wellness/Movement dashboards (`src/features/intelligence`) reflect a real
 * camera session instead of demo data.
 *
 * Gestures and exercise sets only ever populate when the user has turned on
 * "hand"/"pose" tracking mode (both off by default, see
 * `DEFAULT_TRACKING_CONFIG`) — this hook doesn't change that default, it
 * just reports whatever's actually enabled.
 *
 * Runs its own read-only loop over `frameRef.current` — deliberately does
 * NOT touch `use-body-tracking.ts`'s detection `tick()`, which stays
 * network-free per its own doc comment.
 *
 * <TrackingProvider>: useTrackingSessionSync({ frameRef, active })
 */

import { useEffect, useRef, useState } from "react";
import { apiFetch, apiFetchJson } from "@/features/auth";
import type { RefObject } from "react";
import type { TrackingFrame, TrackingPoint } from "../types";

const FLUSH_INTERVAL_MS = 10_000;
const BASELINE_SAMPLE_TARGET = 30; // ~1-2s of frames with a face present
const LONG_CLOSURE_MS = 500; // eye closure this long or longer = microsleep proxy, not a normal blink
const FACE_LOST_DISTRACTION_MS = 3000;
const YAW_EXCURSION_DEG = 30;
const YAW_EXCURSION_MS = 2500;

// Same 7 literals as `src/features/intelligence/types.ts`'s `GestureType` and
// the `/metrics` route's zod schema — redeclared locally rather than
// imported, so this lower-level tracking feature stays decoupled from the
// dashboard feature's types (matches how the wire-format route itself
// re-declares the set independently rather than importing it).
export type GestureType =
  "wave" | "raise-hand" | "point" | "thumbs-up" | "pinch" | "open-palm" | "closed-hand";

const GESTURE_LABELS: Record<GestureType, string> = {
  wave: "Wave",
  "raise-hand": "Raised hand",
  point: "Point",
  "thumbs-up": "Thumbs up",
  pinch: "Pinch",
  "open-palm": "Open palm",
  "closed-hand": "Closed hand",
};

const GESTURE_DEBOUNCE_MS = 2000; // minimum gap between repeat emissions of the SAME gesture type
// Blinking is continuous (real humans blink every few seconds) — logging
// every single blink would flood the 20-entry timeline within a minute and
// bury every other event. This debounces to at most one "Blinked" entry
// per window, same spirit as GESTURE_DEBOUNCE_MS but scaled to how much
// more frequent blinks are.
const BLINK_TIMELINE_DEBOUNCE_MS = 20_000;
// Smile is a state transition (not-smiling -> smiling), not a per-frame
// event, so it debounces far less aggressively than blinks — this just
// stops rapid flicker right at the blendshape threshold from re-firing.
const SMILE_TIMELINE_DEBOUNCE_MS = 5_000;
const WAVE_WINDOW_MS = 1500;
const WAVE_MIN_REVERSALS = 4; // direction reversals of wrist x within the window to call it a "wave", not a drift
const MIN_WAVE_DELTA = 0.01; // normalized-x noise floor below which a frame-to-frame move doesn't count
const RAISE_HAND_Y_THRESHOLD = 0.35; // normalized y (0 = top) — wrist above this line reads as "raised"
const RAISE_HAND_MS = 1000;
const EXTENSION_RATIO = 1.15; // fingertip must be this much farther from the wrist than its MCP joint to count as "extended"
const PINCH_DISTANCE_RATIO = 0.35; // thumb-tip/index-tip distance, as a fraction of hand scale, below which it's a pinch

const MIN_POSE_VISIBILITY = 0.6; // same threshold draw-pose.ts uses to gate rendering
const LOWER_BODY_VISIBLE_FRACTION = 0.3; // fraction of a window's pose frames with hip+ankle visible, to call the window "lower body visible"

const REP_SIGNAL_WINDOW_MS = 3000; // rolling-mean window used to detrend the rep-cycle signal
const REP_AMPLITUDE_THRESHOLD = 0.04; // peak-to-peak swing (normalized y) required to count as a deliberate rep, not fidgeting
const SET_GAP_MS = 20_000; // no new rep for this long closes the current set

// --- Live UI state (Phase 1 of the camera-studio roadmap, INCOMPLETE.md) ---
// Everything below feeds the live camera-page panels (session summary,
// timeline, alerts, face/hand/pose readouts) — separate from the ~10s
// windowed data above that feeds the real backend/dashboards. Nothing here
// is sent anywhere; it's purely local display state, pushed to React at a
// bounded rate so 30-60fps detection doesn't force 30-60 re-renders/sec.
const LIVE_PUSH_INTERVAL_MS = 500;
const MAX_TIMELINE_ENTRIES = 20;
// Mirrors intelligence-metrics-service.ts's classifyMovementState() for the
// LIVE camera page — same thresholds, kept in sync manually since server
// code isn't imported into this client hook. Gait cadence is computed from
// the same `acc.hipXSamples` buffer the 10s flush already fills, just read
// continuously instead of only at flush time.
const LIVE_MOTION_ENERGY_IDLE_THRESHOLD = 0.002;
const LIVE_WALKING_CADENCE_PER_MIN = 30;
const LIVE_RUNNING_CADENCE_PER_MIN = 90;

// A jump: hip height rises at least this much (normalized frame-height,
// smaller y = higher on screen) above its recent baseline, then returns,
// within a short window — distinct from sustained gait.
const JUMP_RISE_THRESHOLD = 0.035;
const JUMP_MAX_MS = 700;
const JUMP_DISPLAY_MS = 600; // how long "jumping" stays reported after detection, so it's visible rather than a single 500ms-push blip

// Pose landmark indices (MediaPipe Pose's 33-point model).
const POSE_LANDMARKS = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;
// Mirrors CALORIES_PER_REP in src/server/services/tracking-service.ts — for
// a live-preview estimate only, the server computes the real stored value.
const LIVE_CALORIES_PER_REP = 2;

export type MovementState = "sitting" | "standing" | "walking" | "running" | "jumping" | "idle";

export interface TimelineEntry {
  id: string;
  time: string; // ISO, wall-clock
  label: string;
}

export interface LiveTrackingStats {
  sessionStartedAt: string | null; // ISO
  elapsedSeconds: number;
  activeSeconds: number; // time a face was actually detected
  idleSeconds: number; // time no face was detected

  faceDetected: boolean;
  /** How many faces the model sees this frame — only ever used for a "multiple people detected" alert; every score above still tracks a single primary face. */
  faceCount: number;
  headPitch: number | null;
  headYaw: number | null;
  headRoll: number | null;
  blinkCountTotal: number;
  smile: boolean;
  /** Real continuous 0-100 blendshape-derived score — `smile` above is just this thresholded. */
  smileScore: number | null;
  mouthOpen: boolean;
  lookingAway: boolean;
  faceLostSeconds: number;
  eyesClosedSeconds: number;
  /** Face bounding-box area as % of frame (0-100) — an honest "how big does the face look" proxy, not a calibrated real-world distance (no depth sensor). */
  faceSizePercent: number | null;
  /** Real iris-within-eye-socket estimate, not calibrated gaze tracking — see FaceTrackingResult.eyeContact. `null` when unavailable. */
  eyeContact: boolean | null;

  currentGesture: GestureType | null;
  /** 0-100 rule-based match strength for `currentGesture` — see StaticGestureMatch. `null` when no gesture is currently classified. */
  currentGestureMatchStrength: number | null;
  gestureCountTotal: number;
  handVisible: { left: boolean; right: boolean };
  /** Real per-hand finger count/pinch distance/rotation/speed/visibility — `null` per side while that hand isn't visible. */
  handStats: { left: HandLiveStats | null; right: HandLiveStats | null };

  currentMovementState: MovementState | null; // null = "pose" mode not on / no data yet
  /** Real average per-frame landmark displacement (motion energy) — relative units, not a calibrated real-world speed (no depth/distance-to-camera calibration exists). */
  movementSpeed: number | null;
  /** Real elbow/knee joint angles — null per joint when not confidently visible this frame. */
  bodyAngles: PoseBodyAngles | null;
  /** Real horizontal hip-sway stability estimate (0-100) — see computeBalanceScore's doc comment for exactly what this is and isn't. */
  poseBalanceScore: number | null;
  exerciseSetCountTotal: number;
  currentSetReps: number;
  caloriesEstimateLive: number; // rough client-side preview — server computes the real stored value

  attentionScoreLive: number | null;
  postureScoreLive: number | null;
  fatigueScoreLive: number | null;
  attentionHigh: number | null;
  attentionLow: number | null;
  attentionAvg: number | null;

  timeline: TimelineEntry[];
}

function emptyLiveStats(): LiveTrackingStats {
  return {
    sessionStartedAt: null,
    elapsedSeconds: 0,
    activeSeconds: 0,
    idleSeconds: 0,
    faceDetected: false,
    faceCount: 0,
    headPitch: null,
    headYaw: null,
    headRoll: null,
    blinkCountTotal: 0,
    smile: false,
    smileScore: null,
    mouthOpen: false,
    lookingAway: false,
    faceLostSeconds: 0,
    eyesClosedSeconds: 0,
    faceSizePercent: null,
    eyeContact: null,
    currentGesture: null,
    currentGestureMatchStrength: null,
    gestureCountTotal: 0,
    handVisible: { left: false, right: false },
    handStats: { left: null, right: null },
    currentMovementState: null,
    movementSpeed: null,
    bodyAngles: null,
    poseBalanceScore: null,
    exerciseSetCountTotal: 0,
    currentSetReps: 0,
    caloriesEstimateLive: 0,
    attentionScoreLive: null,
    postureScoreLive: null,
    fatigueScoreLive: null,
    attentionHigh: null,
    attentionLow: null,
    attentionAvg: null,
    timeline: [],
  };
}

interface TrackingSessionRecord {
  id: string;
}

type QueuedEvent =
  | { type: "distraction" | "drowsiness_alert"; message: string; durationSeconds?: number }
  | { type: "gesture"; message: string; gestureType: GestureType };

interface HeadRotationBaseline {
  pitch: number;
  yaw: number;
  roll: number;
}

/** Mutable per-window tallying state — kept in a ref so accumulation never triggers a re-render. */
interface Accumulator {
  frameCount: number;
  facePresentFrames: number;
  blinkCount: number;
  eyesClosedFrameCount: number;
  longEyeClosureCount: number;
  yawDevSum: number;
  yawDevSumSq: number;
  pitchDevSum: number;
  pitchDevSumSq: number;
  rollDevSum: number;
  rollDevSumSq: number;
  rotationSampleCount: number;
  poseFrameCount: number;
  motionEnergySum: number;
  lowerBodyVisibleFrames: number;
  hipXSamples: { t: number; x: number }[];
  events: QueuedEvent[];
  windowStart: Date;
}

function freshAccumulator(): Accumulator {
  return {
    frameCount: 0,
    facePresentFrames: 0,
    blinkCount: 0,
    eyesClosedFrameCount: 0,
    longEyeClosureCount: 0,
    yawDevSum: 0,
    yawDevSumSq: 0,
    pitchDevSum: 0,
    pitchDevSumSq: 0,
    rollDevSum: 0,
    rollDevSumSq: 0,
    rotationSampleCount: 0,
    poseFrameCount: 0,
    motionEnergySum: 0,
    lowerBodyVisibleFrames: 0,
    hipXSamples: [],
    events: [],
    windowStart: new Date(),
  };
}

function meanAndStdDev(
  sum: number,
  sumSq: number,
  count: number,
): { mean: number; stdDev: number } {
  if (count === 0) return { mean: 0, stdDev: 0 };
  const mean = sum / count;
  const variance = Math.max(sumSq / count - mean * mean, 0);
  return { mean, stdDev: Math.sqrt(variance) };
}

function dist2D(a: TrackingPoint, b: TrackingPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Real joint angle (degrees, 0-180) at vertex `b`, between vectors b→a and b→c — standard 3-point pose-estimation geometry. */
function angleAtDeg(a: TrackingPoint, b: TrackingPoint, c: TrackingPoint): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag < 1e-6) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

function angleIfVisible(
  points: TrackingPoint[],
  aIdx: number,
  bIdx: number,
  cIdx: number,
): number | null {
  const a = points[aIdx];
  const b = points[bIdx];
  const c = points[cIdx];
  if (!a || !b || !c) return null;
  if ((a.visibility ?? 0) < MIN_POSE_VISIBILITY) return null;
  if ((b.visibility ?? 0) < MIN_POSE_VISIBILITY) return null;
  if ((c.visibility ?? 0) < MIN_POSE_VISIBILITY) return null;
  return angleAtDeg(a, b, c);
}

export interface PoseBodyAngles {
  leftElbowDeg: number | null;
  rightElbowDeg: number | null;
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
}

/** Real elbow/knee joint angles from 3-point landmark geometry — `null` per joint when its 3 landmarks aren't all confidently visible this frame. */
function computeBodyAngles(points: TrackingPoint[]): PoseBodyAngles {
  const L = POSE_LANDMARKS;
  return {
    leftElbowDeg: angleIfVisible(points, L.leftShoulder, L.leftElbow, L.leftWrist),
    rightElbowDeg: angleIfVisible(points, L.rightShoulder, L.rightElbow, L.rightWrist),
    leftKneeDeg: angleIfVisible(points, L.leftHip, L.leftKnee, L.leftAnkle),
    rightKneeDeg: angleIfVisible(points, L.rightHip, L.rightKnee, L.rightAnkle),
  };
}

/** Real horizontal hip-sway stability estimate (lower stddev of hip x-position = steadier = higher score) — NOT a biomechanical center-of-mass/balance measurement, just what's derivable from 2D landmarks over time. Distinct from the head-yaw-based posture "balance" proxy in intelligence-metrics-service.ts. */
function computeBalanceScore(hipXSamples: { t: number; x: number }[]): number | null {
  if (hipXSamples.length < 3) return null;
  const mean = hipXSamples.reduce((s, v) => s + v.x, 0) / hipXSamples.length;
  const variance = hipXSamples.reduce((s, v) => s + (v.x - mean) ** 2, 0) / hipXSamples.length;
  const stdDev = Math.sqrt(variance);
  const SWAY_SCALE = 0.05; // stddev (normalized frame-width) at which the score bottoms out at 0
  return Math.round(Math.min(1, Math.max(0, 1 - stdDev / SWAY_SCALE)) * 100);
}

/** Counts direction reversals of `x` across the buffer, ignoring moves smaller than `minDelta` (noise). */
function countDirectionReversals(buffer: { t: number; x: number }[], minDelta: number): number {
  let reversals = 0;
  let lastSign = 0;
  for (let i = 1; i < buffer.length; i++) {
    const delta = buffer[i]!.x - buffer[i - 1]!.x;
    if (Math.abs(delta) < minDelta) continue;
    const sign = Math.sign(delta);
    if (lastSign !== 0 && sign !== lastSign) reversals++;
    lastSign = sign;
  }
  return reversals;
}

// --- Hand shape classification (static gestures) ----------------------------

const FINGER_JOINTS = {
  thumb: { mcp: 2, tip: 4 },
  index: { mcp: 5, tip: 8 },
  middle: { mcp: 9, tip: 12 },
  ring: { mcp: 13, tip: 16 },
  pinky: { mcp: 17, tip: 20 },
} as const;

interface HandShape {
  thumbExt: boolean;
  indexExt: boolean;
  middleExt: boolean;
  ringExt: boolean;
  pinkyExt: boolean;
  pinchDistRatio: number;
  /** Real count of extended fingers (0-5), summing the 5 booleans above — thumb included. */
  fingerCount: number;
  /** Real 2D in-plane rotation of the hand (wrist → middle-finger-MCP vector vs. vertical), degrees — an image-plane roll angle, not full 3D wrist pronation/supination (that would need reliable depth, which MediaPipe hand landmarks don't provide). */
  wristRotationDeg: number;
  // Raw per-finger extension ratios (tip-distance / mcp-distance from the
  // wrist), kept alongside the thresholded booleans above so
  // classifyStaticGesture can derive a real margin-based confidence instead
  // of a fabricated one.
  ratios: { thumb: number; index: number; middle: number; ring: number; pinky: number };
}

function analyzeHandShape(points: TrackingPoint[]): HandShape {
  const wrist = points[0]!;
  const scale = Math.max(dist2D(wrist, points[9]!), 1e-4); // wrist-to-middle-MCP, a rough hand-size reference
  const ratioOf = (mcpIdx: number, tipIdx: number) =>
    dist2D(wrist, points[tipIdx]!) / Math.max(dist2D(wrist, points[mcpIdx]!), 1e-4);

  const ratios = {
    thumb: ratioOf(FINGER_JOINTS.thumb.mcp, FINGER_JOINTS.thumb.tip),
    index: ratioOf(FINGER_JOINTS.index.mcp, FINGER_JOINTS.index.tip),
    middle: ratioOf(FINGER_JOINTS.middle.mcp, FINGER_JOINTS.middle.tip),
    ring: ratioOf(FINGER_JOINTS.ring.mcp, FINGER_JOINTS.ring.tip),
    pinky: ratioOf(FINGER_JOINTS.pinky.mcp, FINGER_JOINTS.pinky.tip),
  };
  const thumbExt = ratios.thumb > EXTENSION_RATIO;
  const indexExt = ratios.index > EXTENSION_RATIO;
  const middleExt = ratios.middle > EXTENSION_RATIO;
  const ringExt = ratios.ring > EXTENSION_RATIO;
  const pinkyExt = ratios.pinky > EXTENSION_RATIO;

  const middleMcp = points[9]!;
  const rotationRad = Math.atan2(middleMcp.x - wrist.x, -(middleMcp.y - wrist.y));

  return {
    thumbExt,
    indexExt,
    middleExt,
    ringExt,
    pinkyExt,
    pinchDistRatio: dist2D(points[4]!, points[8]!) / scale,
    fingerCount: [thumbExt, indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length,
    wristRotationDeg: (rotationRad * 180) / Math.PI,
    ratios,
  };
}

interface StaticGestureMatch {
  type: GestureType;
  /** 0-100 — how far the deciding measurement sits past its threshold, not a raw ML confidence (this is rule-based classification, not a model): a pinch right at the threshold reads ~0%, a pinch with fingertips touching reads ~100%. */
  matchStrength: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Single-frame shape match — `null` when the hand isn't in one of the 5 recognized static poses this frame. */
function classifyStaticGesture(shape: HandShape): StaticGestureMatch | null {
  const nonThumbExtendedCount = [
    shape.indexExt,
    shape.middleExt,
    shape.ringExt,
    shape.pinkyExt,
  ].filter(Boolean).length;

  if (shape.pinchDistRatio < PINCH_DISTANCE_RATIO) {
    return {
      type: "pinch",
      matchStrength: clamp01(1 - shape.pinchDistRatio / PINCH_DISTANCE_RATIO) * 100,
    };
  }
  if (shape.thumbExt && nonThumbExtendedCount === 0) {
    return { type: "thumbs-up", matchStrength: extensionMargin([shape.ratios.thumb]) };
  }
  if (shape.indexExt && nonThumbExtendedCount === 1) {
    return { type: "point", matchStrength: extensionMargin([shape.ratios.index]) };
  }
  if (shape.thumbExt && nonThumbExtendedCount === 4) {
    return {
      type: "open-palm",
      matchStrength: extensionMargin(Object.values(shape.ratios)),
    };
  }
  if (!shape.thumbExt && nonThumbExtendedCount === 0) {
    return {
      type: "closed-hand",
      matchStrength: extensionMargin(Object.values(shape.ratios).map((r) => 1 / r)),
    };
  }
  return null;
}

/** Average, over the given extension ratios, of how far each sits past `EXTENSION_RATIO` — scaled to a 0-100 "how clearly extended" reading. */
function extensionMargin(ratios: number[]): number {
  const avg =
    ratios.reduce((sum, r) => sum + clamp01((r - EXTENSION_RATIO) / EXTENSION_RATIO), 0) /
    ratios.length;
  return clamp01(avg) * 100;
}

interface HandGestureState {
  wristXBuffer: { t: number; x: number }[];
  raiseHandSinceMs: number | null;
  raiseHandFlagged: boolean;
  /** Previous wrist position+time, for a real frame-to-frame speed calc. */
  lastWrist: { t: number; x: number; y: number } | null;
}

function freshHandGestureState(): HandGestureState {
  return { wristXBuffer: [], raiseHandSinceMs: null, raiseHandFlagged: false, lastWrist: null };
}

export interface HandLiveStats {
  /** 0-5, real count of extended fingers. */
  fingerCount: number;
  /** Real thumb-tip/index-tip distance as a fraction of hand size — smaller = closer to pinching. */
  pinchDistRatio: number;
  /** Real 2D in-plane rotation, degrees — see HandShape.wristRotationDeg. */
  wristRotationDeg: number;
  /** Real frame-to-frame wrist displacement, in normalized-frame-widths per second — not a physical speed (no depth/calibration), but a genuine relative measurement. */
  speed: number;
  /** Real handedness-classification confidence (0-1) — see HandTrackingResult.confidence. */
  visibility: number;
}

// --- Exercise rep-cycle detector --------------------------------------------
// Generic repetitive-motion counter, not tied to any specific exercise — see
// the "Movement set" label used when a completed set is POSTed. Tracks a
// single scalar "rep signal" (average height of visible shoulders/hips) and
// counts amplitude-gated crossings of its own rolling mean.

interface RepCycleState {
  signalBuffer: { t: number; y: number }[];
  side: "above" | "below" | null;
  crossingCount: number;
  setReps: number;
  setStartMs: number | null;
  lastRepMs: number | null;
}

function freshRepCycleState(): RepCycleState {
  return {
    signalBuffer: [],
    side: null,
    crossingCount: 0,
    setReps: 0,
    setStartMs: null,
    lastRepMs: null,
  };
}

function poseRepSignal(points: TrackingPoint[]): number | null {
  const candidates = [11, 12, 23, 24] // shoulders, hips
    .map((i) => points[i])
    .filter((p): p is TrackingPoint => !!p && (p.visibility ?? 0) >= MIN_POSE_VISIBILITY);
  if (candidates.length === 0) return null;
  return candidates.reduce((sum, p) => sum + p.y, 0) / candidates.length;
}

export interface UseTrackingSessionSyncOptions {
  frameRef: RefObject<TrackingFrame | null>;
  active: boolean;
  /** Gates gesture classification/tallying only — hand *tracking* (visibility, landmarks) keeps running regardless, since gesture recognition is derived from the same hand-landmarker output, not a separate model. Defaults to true. */
  gestureRecognitionEnabled?: boolean;
}

export interface UseTrackingSessionSyncResult {
  live: LiveTrackingStats;
}

export function useTrackingSessionSync({
  frameRef,
  active,
  gestureRecognitionEnabled = true,
}: UseTrackingSessionSyncOptions): UseTrackingSessionSyncResult {
  // A ref (not a dependency of the big effect below) so toggling this
  // doesn't tear down and reset the whole session accumulator — the effect
  // only reads the latest value each frame via this ref.
  const gestureRecognitionEnabledRef = useRef(gestureRecognitionEnabled);
  useEffect(() => {
    gestureRecognitionEnabledRef.current = gestureRecognitionEnabled;
  }, [gestureRecognitionEnabled]);
  const sessionIdRef = useRef<string | null>(null);
  const accRef = useRef<Accumulator>(freshAccumulator());
  const baselineRef = useRef<HeadRotationBaseline | null>(null);
  const baselineSamplesRef = useRef<HeadRotationBaseline[]>([]);
  const lastProcessedTimestampRef = useRef<number | null>(null);
  const eyesClosedSinceRef = useRef<number | null>(null);
  const faceLostSinceRef = useRef<number | null>(null);
  const faceLostFlaggedRef = useRef(false);
  const yawExcursionSinceRef = useRef<number | null>(null);
  const yawExcursionFlaggedRef = useRef(false);
  const lastBlinkTimelineAtRef = useRef<number>(-Infinity);
  const wasSmilingRef = useRef(false);
  const lastSmileTimelineAtRef = useRef<number>(-Infinity);

  const handStatesRef = useRef<Map<"left" | "right", HandGestureState>>(new Map());
  const lastGestureEmittedRef = useRef<Map<GestureType, number>>(new Map());
  const prevPosePointsRef = useRef<TrackingPoint[] | null>(null);
  const repCycleRef = useRef<RepCycleState>(freshRepCycleState());
  // Independent of the 10s flush accumulator (which resets on every flush) —
  // jump detection needs a short continuous window, not a windowed average.
  const hipYBufferRef = useRef<{ t: number; y: number }[]>([]);
  const lastJumpDetectedAtRef = useRef<number | null>(null);

  // --- Live UI state ---
  const sessionStartedAtRef = useRef<Date | null>(null);
  const lifetimeFrameCountRef = useRef(0);
  const lifetimeFacePresentFramesRef = useRef(0);
  const lifetimeBlinkCountRef = useRef(0);
  const lifetimeGestureCountRef = useRef(0);
  const lifetimeExerciseSetCountRef = useRef(0);
  const lifetimeRepsTotalRef = useRef(0);
  const currentGestureRef = useRef<GestureType | null>(null);
  const currentGestureMatchStrengthRef = useRef<number | null>(null);
  const handVisibleRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const handLiveStatsRef = useRef<{ left: HandLiveStats | null; right: HandLiveStats | null }>({
    left: null,
    right: null,
  });
  const latestScoresRef = useRef<{
    attention: number | null;
    posture: number | null;
    fatigue: number | null;
  }>({ attention: null, posture: null, fatigue: null });
  const attentionStatsRef = useRef<{ sum: number; count: number; high: number; low: number }>({
    sum: 0,
    count: 0,
    high: -Infinity,
    low: Infinity,
  });
  const timelineRef = useRef<TimelineEntry[]>([]);
  const [liveStats, setLiveStats] = useState<LiveTrackingStats>(emptyLiveStats);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let rafHandle = 0;
    let flushHandle: ReturnType<typeof setInterval> | null = null;
    let livePushHandle: ReturnType<typeof setInterval> | null = null;

    function pushTimelineEntry(label: string) {
      timelineRef.current = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: new Date().toISOString(),
          label,
        },
        ...timelineRef.current,
      ].slice(0, MAX_TIMELINE_ENTRIES);
    }

    function buildLiveSnapshot(): LiveTrackingStats {
      const acc = accRef.current;
      const now = Date.now();
      const startedAt = sessionStartedAtRef.current;
      const elapsedSeconds = startedAt ? (now - startedAt.getTime()) / 1000 : 0;
      const lifetimeFrames = lifetimeFrameCountRef.current;
      const presentFraction =
        lifetimeFrames > 0 ? lifetimeFacePresentFramesRef.current / lifetimeFrames : 0;
      const faceLostSeconds =
        faceLostSinceRef.current !== null
          ? Math.max(
              (frameRef.current?.timestampMs ?? faceLostSinceRef.current) -
                faceLostSinceRef.current,
              0,
            ) / 1000
          : 0;
      const eyesClosedSeconds =
        eyesClosedSinceRef.current !== null
          ? Math.max(
              (frameRef.current?.timestampMs ?? eyesClosedSinceRef.current) -
                eyesClosedSinceRef.current,
              0,
            ) / 1000
          : 0;

      const hasPoseData = acc.poseFrameCount > 0;
      const liveMotionEnergy = hasPoseData ? acc.motionEnergySum / acc.poseFrameCount : null;
      const liveLowerBodyVisible = hasPoseData
        ? acc.lowerBodyVisibleFrames / acc.poseFrameCount >= LOWER_BODY_VISIBLE_FRACTION
        : false;
      const liveWindowDurationMs = Math.max(Date.now() - acc.windowStart.getTime(), 1);
      const liveGaitCadencePerMin = hasPoseData
        ? countDirectionReversals(acc.hipXSamples, MIN_WAVE_DELTA) * (60_000 / liveWindowDurationMs)
        : 0;
      const recentlyJumped =
        lastJumpDetectedAtRef.current !== null &&
        Date.now() - lastJumpDetectedAtRef.current < JUMP_DISPLAY_MS;

      const currentMovementState: MovementState | null =
        liveMotionEnergy === null
          ? null
          : recentlyJumped
            ? "jumping"
            : liveMotionEnergy < LIVE_MOTION_ENERGY_IDLE_THRESHOLD
              ? "idle"
              : liveGaitCadencePerMin >= LIVE_RUNNING_CADENCE_PER_MIN
                ? "running"
                : liveGaitCadencePerMin >= LIVE_WALKING_CADENCE_PER_MIN
                  ? "walking"
                  : liveLowerBodyVisible
                    ? "standing"
                    : "sitting";

      const attentionStats = attentionStatsRef.current;
      const face = frameRef.current?.face ?? null;
      const bodyAngles = frameRef.current?.pose
        ? computeBodyAngles(frameRef.current.pose.points)
        : null;
      const poseBalanceScore = hasPoseData ? computeBalanceScore(acc.hipXSamples) : null;

      return {
        sessionStartedAt: startedAt ? startedAt.toISOString() : null,
        elapsedSeconds,
        activeSeconds: elapsedSeconds * presentFraction,
        idleSeconds: elapsedSeconds * (1 - presentFraction),
        faceDetected: !!face,
        faceCount: frameRef.current?.faceCount ?? 0,
        headPitch: face?.headRotation?.pitch ?? null,
        headYaw: face?.headRotation?.yaw ?? null,
        headRoll: face?.headRotation?.roll ?? null,
        blinkCountTotal: lifetimeBlinkCountRef.current,
        smile: face?.smile ?? false,
        smileScore: face?.smileScore ?? null,
        mouthOpen: face?.mouthOpen ?? false,
        faceSizePercent: face ? face.sizeRatio * 100 : null,
        eyeContact: face?.eyeContact ?? null,
        lookingAway: yawExcursionFlaggedRef.current,
        faceLostSeconds,
        eyesClosedSeconds,
        currentGesture: currentGestureRef.current,
        currentGestureMatchStrength: currentGestureMatchStrengthRef.current,
        gestureCountTotal: lifetimeGestureCountRef.current,
        handVisible: { ...handVisibleRef.current },
        handStats: { ...handLiveStatsRef.current },
        currentMovementState,
        movementSpeed: liveMotionEnergy,
        bodyAngles,
        poseBalanceScore,
        exerciseSetCountTotal: lifetimeExerciseSetCountRef.current,
        currentSetReps: repCycleRef.current.setReps,
        caloriesEstimateLive: Math.round(lifetimeRepsTotalRef.current * LIVE_CALORIES_PER_REP),
        attentionScoreLive: latestScoresRef.current.attention,
        postureScoreLive: latestScoresRef.current.posture,
        fatigueScoreLive: latestScoresRef.current.fatigue,
        attentionHigh: attentionStats.count > 0 ? attentionStats.high : null,
        attentionLow: attentionStats.count > 0 ? attentionStats.low : null,
        attentionAvg: attentionStats.count > 0 ? attentionStats.sum / attentionStats.count : null,
        timeline: timelineRef.current,
      };
    }

    function maybeEmitGesture(type: GestureType, timestampMs: number) {
      const last = lastGestureEmittedRef.current.get(type) ?? -Infinity;
      if (timestampMs - last < GESTURE_DEBOUNCE_MS) return;
      lastGestureEmittedRef.current.set(type, timestampMs);
      lifetimeGestureCountRef.current += 1;
      pushTimelineEntry(GESTURE_LABELS[type]);
      accRef.current.events.push({
        type: "gesture",
        message: GESTURE_LABELS[type],
        gestureType: type,
      });
    }

    function processHands(frame: TrackingFrame) {
      handVisibleRef.current = {
        left: frame.hands.some((h) => h.hand === "left"),
        right: frame.hands.some((h) => h.hand === "right"),
      };
      handLiveStatsRef.current = {
        left: frame.hands.find((h) => h.hand === "left") ? handLiveStatsRef.current.left : null,
        right: frame.hands.find((h) => h.hand === "right") ? handLiveStatsRef.current.right : null,
      };
      let liveGesture: GestureType | null = null;
      let liveGestureMatchStrength: number | null = null;

      // Hand *tracking* (visibility above) always keeps running — only
      // gesture classification/tallying is gated, since it's derived from
      // the same hand-landmarker output rather than a separate model.
      if (!gestureRecognitionEnabledRef.current) {
        currentGestureRef.current = null;
        currentGestureMatchStrengthRef.current = null;
        return;
      }

      for (const hand of frame.hands) {
        const shape = analyzeHandShape(hand.points);
        const staticGesture = classifyStaticGesture(shape);
        if (staticGesture) {
          liveGesture = staticGesture.type;
          liveGestureMatchStrength = staticGesture.matchStrength;
          maybeEmitGesture(staticGesture.type, frame.timestampMs);
        }

        let state = handStatesRef.current.get(hand.hand);
        if (!state) {
          state = freshHandGestureState();
          handStatesRef.current.set(hand.hand, state);
        }
        const wrist = hand.points[0]!;

        // Real frame-to-frame displacement over elapsed time — normalized
        // frame-widths/sec, not a physical unit (no depth/calibration).
        let speed = 0;
        if (state.lastWrist && frame.timestampMs > state.lastWrist.t) {
          const dtSeconds = (frame.timestampMs - state.lastWrist.t) / 1000;
          const displacement = Math.hypot(wrist.x - state.lastWrist.x, wrist.y - state.lastWrist.y);
          speed = displacement / dtSeconds;
        }
        state.lastWrist = { t: frame.timestampMs, x: wrist.x, y: wrist.y };

        handLiveStatsRef.current[hand.hand] = {
          fingerCount: shape.fingerCount,
          pinchDistRatio: shape.pinchDistRatio,
          wristRotationDeg: shape.wristRotationDeg,
          speed,
          visibility: hand.confidence,
        };

        state.wristXBuffer.push({ t: frame.timestampMs, x: wrist.x });
        while (
          state.wristXBuffer.length > 0 &&
          frame.timestampMs - state.wristXBuffer[0]!.t > WAVE_WINDOW_MS
        ) {
          state.wristXBuffer.shift();
        }
        const roughlyOpen =
          [shape.indexExt, shape.middleExt, shape.ringExt, shape.pinkyExt].filter(Boolean).length >=
          3;
        if (
          roughlyOpen &&
          countDirectionReversals(state.wristXBuffer, MIN_WAVE_DELTA) >= WAVE_MIN_REVERSALS
        ) {
          maybeEmitGesture("wave", frame.timestampMs);
        }

        if (wrist.y < RAISE_HAND_Y_THRESHOLD) {
          if (state.raiseHandSinceMs === null) {
            state.raiseHandSinceMs = frame.timestampMs;
          } else if (
            !state.raiseHandFlagged &&
            frame.timestampMs - state.raiseHandSinceMs >= RAISE_HAND_MS
          ) {
            maybeEmitGesture("raise-hand", frame.timestampMs);
            state.raiseHandFlagged = true;
          }
        } else {
          state.raiseHandSinceMs = null;
          state.raiseHandFlagged = false;
        }
      }

      currentGestureRef.current = liveGesture;
      currentGestureMatchStrengthRef.current = liveGestureMatchStrength;
    }

    // Takes `sessionId` explicitly rather than reading `sessionIdRef` itself —
    // the cleanup path calls this AFTER already nulling that ref (session
    // teardown order), so reading the ref here would silently drop the final
    // in-progress set right when the session ends.
    async function closeExerciseSet(sessionId: string) {
      const cycle = repCycleRef.current;
      if (cycle.setReps === 0 || cycle.setStartMs === null || cycle.lastRepMs === null) return;

      const durationSeconds = Math.max((cycle.lastRepMs - cycle.setStartMs) / 1000, 0);
      const reps = cycle.setReps;
      repCycleRef.current = freshRepCycleState();
      lifetimeExerciseSetCountRef.current += 1;
      lifetimeRepsTotalRef.current += reps;
      pushTimelineEntry(`Rep completed × ${reps}`);

      try {
        await apiFetch(`/api/v1/tracking/${sessionId}/exercise-set`, {
          method: "POST",
          body: JSON.stringify({ reps, durationSeconds }),
        });
      } catch {
        // Best-effort — a dropped set just means one fewer row in the exercise history.
      }
    }

    function processPoseMovement(frame: TrackingFrame) {
      const pose = frame.pose;
      if (!pose) return;
      const acc = accRef.current;
      acc.poseFrameCount += 1;

      const prevPoints = prevPosePointsRef.current;
      if (prevPoints && prevPoints.length === pose.points.length) {
        let totalDisplacement = 0;
        let counted = 0;
        for (let i = 0; i < pose.points.length; i++) {
          const curr = pose.points[i]!;
          const prev = prevPoints[i]!;
          if ((curr.visibility ?? 1) < MIN_POSE_VISIBILITY) continue;
          totalDisplacement += dist2D(curr, prev);
          counted += 1;
        }
        if (counted > 0) acc.motionEnergySum += totalDisplacement / counted;
      }
      prevPosePointsRef.current = pose.points;

      const leftHip = pose.points[23];
      const rightHip = pose.points[24];
      const leftAnkle = pose.points[27];
      const rightAnkle = pose.points[28];
      const hipVisible =
        (leftHip?.visibility ?? 0) >= MIN_POSE_VISIBILITY ||
        (rightHip?.visibility ?? 0) >= MIN_POSE_VISIBILITY;
      const ankleVisible =
        (leftAnkle?.visibility ?? 0) >= MIN_POSE_VISIBILITY ||
        (rightAnkle?.visibility ?? 0) >= MIN_POSE_VISIBILITY;
      if (hipVisible && ankleVisible) acc.lowerBodyVisibleFrames += 1;

      if (hipVisible) {
        const hipXs = [leftHip, rightHip]
          .filter((p): p is TrackingPoint => !!p && (p.visibility ?? 0) >= MIN_POSE_VISIBILITY)
          .map((p) => p.x);
        acc.hipXSamples.push({
          t: frame.timestampMs,
          x: hipXs.reduce((s, v) => s + v, 0) / hipXs.length,
        });
      }

      // Jump detection: a real short vertical hip-height rise-then-return,
      // independent of the flush accumulator so it isn't tied to the 10s
      // window. Smaller y = higher on screen, so a jump is a dip in y.
      if (hipVisible) {
        const hipYs = [leftHip, rightHip]
          .filter((p): p is TrackingPoint => !!p && (p.visibility ?? 0) >= MIN_POSE_VISIBILITY)
          .map((p) => p.y);
        const hipY = hipYs.reduce((s, v) => s + v, 0) / hipYs.length;
        const buffer = hipYBufferRef.current;
        buffer.push({ t: frame.timestampMs, y: hipY });
        while (buffer.length > 0 && frame.timestampMs - buffer[0]!.t > JUMP_MAX_MS) buffer.shift();
        if (buffer.length >= 3) {
          const baseline = buffer[0]!.y;
          const peak = Math.min(...buffer.map((s) => s.y));
          const rise = baseline - peak;
          const landed = hipY - peak < rise * 0.4; // back down toward baseline
          if (rise >= JUMP_RISE_THRESHOLD && landed) {
            lastJumpDetectedAtRef.current = frame.timestampMs;
          }
        }
      }

      // Exercise rep-cycle detector — amplitude-gated crossings of the
      // signal's own short rolling mean, generic across exercise types.
      const signal = poseRepSignal(pose.points);
      if (signal === null) return;
      const cycle = repCycleRef.current;
      cycle.signalBuffer.push({ t: frame.timestampMs, y: signal });
      while (
        cycle.signalBuffer.length > 0 &&
        frame.timestampMs - cycle.signalBuffer[0]!.t > REP_SIGNAL_WINDOW_MS
      ) {
        cycle.signalBuffer.shift();
      }
      const mean = cycle.signalBuffer.reduce((s, p) => s + p.y, 0) / cycle.signalBuffer.length;
      const deviation = signal - mean;
      const half = REP_AMPLITUDE_THRESHOLD / 2;
      const side: "above" | "below" | null =
        deviation > half ? "above" : deviation < -half ? "below" : null;

      if (side && cycle.side !== null && side !== cycle.side) {
        cycle.crossingCount += 1;
        if (cycle.crossingCount % 2 === 0) {
          if (cycle.setReps === 0) {
            cycle.setStartMs = frame.timestampMs;
            pushTimelineEntry("Exercise started");
          }
          cycle.setReps += 1;
          cycle.lastRepMs = frame.timestampMs;
        }
      }
      if (side) cycle.side = side;

      if (
        cycle.setReps > 0 &&
        cycle.lastRepMs !== null &&
        frame.timestampMs - cycle.lastRepMs > SET_GAP_MS &&
        sessionIdRef.current
      ) {
        void closeExerciseSet(sessionIdRef.current);
      }
    }

    function processFace(frame: TrackingFrame) {
      const acc = accRef.current;

      const face = frame.face;
      if (!face) {
        eyesClosedSinceRef.current = null;
        if (faceLostSinceRef.current === null) {
          faceLostSinceRef.current = frame.timestampMs;
        } else if (
          !faceLostFlaggedRef.current &&
          frame.timestampMs - faceLostSinceRef.current >= FACE_LOST_DISTRACTION_MS
        ) {
          acc.events.push({ type: "distraction", message: "Left the frame" });
          pushTimelineEntry("Left the frame");
          faceLostFlaggedRef.current = true;
        }
        return;
      }

      faceLostSinceRef.current = null;
      faceLostFlaggedRef.current = false;
      acc.facePresentFrames += 1;
      lifetimeFacePresentFramesRef.current += 1;

      // Blink / eye-closure duration state machine — PERCLOS + microsleep proxy inputs.
      const eyesClosed = face.blink.left && face.blink.right;
      if (eyesClosed) {
        if (eyesClosedSinceRef.current === null) eyesClosedSinceRef.current = frame.timestampMs;
        acc.eyesClosedFrameCount += 1;
      } else if (eyesClosedSinceRef.current !== null) {
        const closedDurationMs = frame.timestampMs - eyesClosedSinceRef.current;
        if (closedDurationMs >= LONG_CLOSURE_MS) {
          acc.longEyeClosureCount += 1;
          acc.events.push({
            type: "drowsiness_alert",
            message: "Eyes closed for an extended period",
            durationSeconds: closedDurationMs / 1000,
          });
          pushTimelineEntry("Eyes closed for an extended period");
        } else {
          acc.blinkCount += 1;
          lifetimeBlinkCountRef.current += 1;
          if (frame.timestampMs - lastBlinkTimelineAtRef.current >= BLINK_TIMELINE_DEBOUNCE_MS) {
            lastBlinkTimelineAtRef.current = frame.timestampMs;
            pushTimelineEntry("Blinked");
          }
        }
        eyesClosedSinceRef.current = null;
      }

      // Smile — a real state transition (not-smiling -> smiling), debounced
      // against threshold flicker, not logged on every frame while smiling.
      if (face.smile && !wasSmilingRef.current) {
        if (frame.timestampMs - lastSmileTimelineAtRef.current >= SMILE_TIMELINE_DEBOUNCE_MS) {
          lastSmileTimelineAtRef.current = frame.timestampMs;
          pushTimelineEntry("Smile");
        }
      }
      wasSmilingRef.current = face.smile;

      const rotation = face.headRotation;
      if (!rotation) return;

      // Calibrate a per-session neutral baseline from the first N real
      // samples, then only ever accumulate baseline-relative deviations —
      // the server never sees raw head angles, only how far they drift.
      if (!baselineRef.current) {
        baselineSamplesRef.current.push(rotation);
        if (baselineSamplesRef.current.length >= BASELINE_SAMPLE_TARGET) {
          const samples = baselineSamplesRef.current;
          baselineRef.current = {
            pitch: samples.reduce((s, r) => s + r.pitch, 0) / samples.length,
            yaw: samples.reduce((s, r) => s + r.yaw, 0) / samples.length,
            roll: samples.reduce((s, r) => s + r.roll, 0) / samples.length,
          };
        }
        return;
      }

      const baseline = baselineRef.current;
      const yawDev = rotation.yaw - baseline.yaw;
      const pitchDev = rotation.pitch - baseline.pitch;
      const rollDev = rotation.roll - baseline.roll;

      acc.yawDevSum += yawDev;
      acc.yawDevSumSq += yawDev * yawDev;
      acc.pitchDevSum += pitchDev;
      acc.pitchDevSumSq += pitchDev * pitchDev;
      acc.rollDevSum += rollDev;
      acc.rollDevSumSq += rollDev * rollDev;
      acc.rotationSampleCount += 1;

      // Sustained "looked away" — a distinct distraction signal from face-loss above.
      if (Math.abs(yawDev) >= YAW_EXCURSION_DEG) {
        if (yawExcursionSinceRef.current === null) {
          yawExcursionSinceRef.current = frame.timestampMs;
        } else if (
          !yawExcursionFlaggedRef.current &&
          frame.timestampMs - yawExcursionSinceRef.current >= YAW_EXCURSION_MS
        ) {
          acc.events.push({ type: "distraction", message: "Looked away" });
          pushTimelineEntry("Looked away");
          yawExcursionFlaggedRef.current = true;
        }
      } else {
        yawExcursionSinceRef.current = null;
        yawExcursionFlaggedRef.current = false;
      }
    }

    function processFrame(frame: TrackingFrame) {
      accRef.current.frameCount += 1;
      lifetimeFrameCountRef.current += 1;
      processFace(frame);
      if (frame.hands.length > 0) {
        processHands(frame);
      } else {
        handVisibleRef.current = { left: false, right: false };
        handLiveStatsRef.current = { left: null, right: null };
        currentGestureRef.current = null;
        currentGestureMatchStrengthRef.current = null;
      }
      processPoseMovement(frame);
    }

    function tick() {
      if (cancelled) return;
      const frame = frameRef.current;
      if (frame && frame.timestampMs !== lastProcessedTimestampRef.current) {
        lastProcessedTimestampRef.current = frame.timestampMs;
        processFrame(frame);
      }
      rafHandle = requestAnimationFrame(tick);
    }

    async function flush(isFinal: boolean) {
      const sessionId = sessionIdRef.current;
      const acc = accRef.current;
      if (!sessionId || acc.frameCount === 0) return;

      const windowEnd = new Date();
      const yaw = meanAndStdDev(acc.yawDevSum, acc.yawDevSumSq, acc.rotationSampleCount);
      const pitch = meanAndStdDev(acc.pitchDevSum, acc.pitchDevSumSq, acc.rotationSampleCount);
      const roll = meanAndStdDev(acc.rollDevSum, acc.rollDevSumSq, acc.rotationSampleCount);

      const hasPoseData = acc.poseFrameCount > 0;
      const motionEnergy = hasPoseData ? acc.motionEnergySum / acc.poseFrameCount : undefined;
      const lowerBodyVisible = hasPoseData
        ? acc.lowerBodyVisibleFrames / acc.poseFrameCount >= LOWER_BODY_VISIBLE_FRACTION
        : undefined;
      const windowDurationMs = Math.max(windowEnd.getTime() - acc.windowStart.getTime(), 1);
      const gaitCadencePerMin = hasPoseData
        ? countDirectionReversals(acc.hipXSamples, MIN_WAVE_DELTA) * (60_000 / windowDurationMs)
        : undefined;

      accRef.current = freshAccumulator();

      try {
        const response = await apiFetch(`/api/v1/tracking/${sessionId}/metrics`, {
          method: "POST",
          body: JSON.stringify({
            windowStart: acc.windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            frameCount: acc.frameCount,
            facePresentFrames: acc.facePresentFrames,
            blinkCount: acc.blinkCount,
            eyesClosedFrameCount: acc.eyesClosedFrameCount,
            longEyeClosureCount: acc.longEyeClosureCount,
            avgHeadYawDev: yaw.mean,
            avgHeadPitchDev: pitch.mean,
            avgHeadRollDev: roll.mean,
            yawStdDev: yaw.stdDev,
            pitchStdDev: pitch.stdDev,
            rollStdDev: roll.stdDev,
            motionEnergy,
            lowerBodyVisible,
            gaitCadencePerMin,
            events: acc.events.length > 0 ? acc.events.slice(0, 20) : undefined,
          }),
        });
        const body = (await response.json()) as {
          data?: { attentionScore?: number; postureScore?: number; fatigueScore?: number };
        };
        if (body.data) {
          const { attentionScore, postureScore, fatigueScore } = body.data;
          latestScoresRef.current = {
            attention: attentionScore ?? latestScoresRef.current.attention,
            posture: postureScore ?? latestScoresRef.current.posture,
            fatigue: fatigueScore ?? latestScoresRef.current.fatigue,
          };
          if (attentionScore !== undefined) {
            const stats = attentionStatsRef.current;
            stats.sum += attentionScore;
            stats.count += 1;
            stats.high = Math.max(stats.high, attentionScore);
            stats.low = Math.min(stats.low, attentionScore);
          }
        }
      } catch {
        // Best-effort telemetry — a dropped window just means a slightly
        // sparser dashboard, never something the user needs to see mid-session.
      }

      if (!isFinal) accRef.current.windowStart = windowEnd;
    }

    async function start() {
      try {
        const session = await apiFetchJson<TrackingSessionRecord>("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({ title: "Camera session", activityKind: "desk-focus" }),
        });
        await apiFetch(`/api/v1/tracking/${session.id}/start`, { method: "POST" });
        if (cancelled) return;

        sessionIdRef.current = session.id;
        accRef.current = freshAccumulator();
        baselineRef.current = null;
        baselineSamplesRef.current = [];
        lastProcessedTimestampRef.current = null;
        eyesClosedSinceRef.current = null;
        faceLostSinceRef.current = null;
        faceLostFlaggedRef.current = false;
        yawExcursionSinceRef.current = null;
        yawExcursionFlaggedRef.current = false;
        lastBlinkTimelineAtRef.current = -Infinity;
        wasSmilingRef.current = false;
        lastSmileTimelineAtRef.current = -Infinity;
        handStatesRef.current = new Map();
        lastGestureEmittedRef.current = new Map();
        prevPosePointsRef.current = null;
        repCycleRef.current = freshRepCycleState();
        hipYBufferRef.current = [];
        lastJumpDetectedAtRef.current = null;

        sessionStartedAtRef.current = new Date();
        lifetimeFrameCountRef.current = 0;
        lifetimeFacePresentFramesRef.current = 0;
        lifetimeBlinkCountRef.current = 0;
        lifetimeGestureCountRef.current = 0;
        lifetimeExerciseSetCountRef.current = 0;
        lifetimeRepsTotalRef.current = 0;
        currentGestureRef.current = null;
        currentGestureMatchStrengthRef.current = null;
        handVisibleRef.current = { left: false, right: false };
        handLiveStatsRef.current = { left: null, right: null };
        latestScoresRef.current = { attention: null, posture: null, fatigue: null };
        attentionStatsRef.current = { sum: 0, count: 0, high: -Infinity, low: Infinity };
        timelineRef.current = [];
        pushTimelineEntry("Session started");
        setLiveStats(buildLiveSnapshot());

        rafHandle = requestAnimationFrame(tick);
        flushHandle = setInterval(() => void flush(false), FLUSH_INTERVAL_MS);
        livePushHandle = setInterval(
          () => setLiveStats(buildLiveSnapshot()),
          LIVE_PUSH_INTERVAL_MS,
        );
      } catch {
        // No session (e.g. not logged in yet, or backend unreachable) — tracking
        // still works locally, it just won't feed the real dashboards this run.
      }
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafHandle);
      if (flushHandle) clearInterval(flushHandle);
      if (livePushHandle) clearInterval(livePushHandle);
      sessionStartedAtRef.current = null;
      setLiveStats(emptyLiveStats());

      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (!sessionId) return;

      void flush(true)
        .then(() => closeExerciseSet(sessionId))
        .then(() =>
          apiFetch(`/api/v1/tracking/${sessionId}/stop`, { method: "POST" }).catch(() => {
            // Best-effort — an unstopped session just stays "active" server-side.
          }),
        );
    };
    // frameRef is a stable ref object for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { live: liveStats };
}
