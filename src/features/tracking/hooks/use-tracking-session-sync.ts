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
// Mirrors intelligence-metrics-service.ts's classifyMovementState() at a
// glance for the LIVE camera page — kept deliberately simpler (no gait
// cadence, since that needs a longer window than feels "live") and kept in
// sync manually since server code isn't imported into this client hook.
const LIVE_MOTION_ENERGY_IDLE_THRESHOLD = 0.002;
// Mirrors CALORIES_PER_REP in src/server/services/tracking-service.ts — for
// a live-preview estimate only, the server computes the real stored value.
const LIVE_CALORIES_PER_REP = 2;

export type MovementState = "sitting" | "standing" | "idle";

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
  mouthOpen: boolean;
  lookingAway: boolean;
  faceLostSeconds: number;
  eyesClosedSeconds: number;

  currentGesture: GestureType | null;
  gestureCountTotal: number;
  handVisible: { left: boolean; right: boolean };

  currentMovementState: MovementState | null; // null = "pose" mode not on / no data yet
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
    mouthOpen: false,
    lookingAway: false,
    faceLostSeconds: 0,
    eyesClosedSeconds: 0,
    currentGesture: null,
    gestureCountTotal: 0,
    handVisible: { left: false, right: false },
    currentMovementState: null,
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
}

function analyzeHandShape(points: TrackingPoint[]): HandShape {
  const wrist = points[0]!;
  const scale = Math.max(dist2D(wrist, points[9]!), 1e-4); // wrist-to-middle-MCP, a rough hand-size reference
  const extended = (mcpIdx: number, tipIdx: number) =>
    dist2D(wrist, points[tipIdx]!) > dist2D(wrist, points[mcpIdx]!) * EXTENSION_RATIO;

  return {
    thumbExt: extended(FINGER_JOINTS.thumb.mcp, FINGER_JOINTS.thumb.tip),
    indexExt: extended(FINGER_JOINTS.index.mcp, FINGER_JOINTS.index.tip),
    middleExt: extended(FINGER_JOINTS.middle.mcp, FINGER_JOINTS.middle.tip),
    ringExt: extended(FINGER_JOINTS.ring.mcp, FINGER_JOINTS.ring.tip),
    pinkyExt: extended(FINGER_JOINTS.pinky.mcp, FINGER_JOINTS.pinky.tip),
    pinchDistRatio: dist2D(points[4]!, points[8]!) / scale,
  };
}

/** Single-frame shape match — `null` when the hand isn't in one of the 5 recognized static poses this frame. */
function classifyStaticGesture(shape: HandShape): GestureType | null {
  const nonThumbExtendedCount = [
    shape.indexExt,
    shape.middleExt,
    shape.ringExt,
    shape.pinkyExt,
  ].filter(Boolean).length;

  if (shape.pinchDistRatio < PINCH_DISTANCE_RATIO) return "pinch";
  if (shape.thumbExt && nonThumbExtendedCount === 0) return "thumbs-up";
  if (shape.indexExt && nonThumbExtendedCount === 1) return "point";
  if (shape.thumbExt && nonThumbExtendedCount === 4) return "open-palm";
  if (!shape.thumbExt && nonThumbExtendedCount === 0) return "closed-hand";
  return null;
}

interface HandGestureState {
  wristXBuffer: { t: number; x: number }[];
  raiseHandSinceMs: number | null;
  raiseHandFlagged: boolean;
}

function freshHandGestureState(): HandGestureState {
  return { wristXBuffer: [], raiseHandSinceMs: null, raiseHandFlagged: false };
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
}

export interface UseTrackingSessionSyncResult {
  live: LiveTrackingStats;
}

export function useTrackingSessionSync({
  frameRef,
  active,
}: UseTrackingSessionSyncOptions): UseTrackingSessionSyncResult {
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

  const handStatesRef = useRef<Map<"left" | "right", HandGestureState>>(new Map());
  const lastGestureEmittedRef = useRef<Map<GestureType, number>>(new Map());
  const prevPosePointsRef = useRef<TrackingPoint[] | null>(null);
  const repCycleRef = useRef<RepCycleState>(freshRepCycleState());

  // --- Live UI state ---
  const sessionStartedAtRef = useRef<Date | null>(null);
  const lifetimeFrameCountRef = useRef(0);
  const lifetimeFacePresentFramesRef = useRef(0);
  const lifetimeBlinkCountRef = useRef(0);
  const lifetimeGestureCountRef = useRef(0);
  const lifetimeExerciseSetCountRef = useRef(0);
  const lifetimeRepsTotalRef = useRef(0);
  const currentGestureRef = useRef<GestureType | null>(null);
  const handVisibleRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
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
      const currentMovementState: MovementState | null =
        liveMotionEnergy === null
          ? null
          : liveMotionEnergy < LIVE_MOTION_ENERGY_IDLE_THRESHOLD
            ? "idle"
            : liveLowerBodyVisible
              ? "standing"
              : "sitting";

      const attentionStats = attentionStatsRef.current;
      const face = frameRef.current?.face ?? null;

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
        mouthOpen: face?.mouthOpen ?? false,
        lookingAway: yawExcursionFlaggedRef.current,
        faceLostSeconds,
        eyesClosedSeconds,
        currentGesture: currentGestureRef.current,
        gestureCountTotal: lifetimeGestureCountRef.current,
        handVisible: { ...handVisibleRef.current },
        currentMovementState,
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
      let liveGesture: GestureType | null = null;

      for (const hand of frame.hands) {
        const shape = analyzeHandShape(hand.points);
        const staticGesture = classifyStaticGesture(shape);
        if (staticGesture) {
          liveGesture = staticGesture;
          maybeEmitGesture(staticGesture, frame.timestampMs);
        }

        let state = handStatesRef.current.get(hand.hand);
        if (!state) {
          state = freshHandGestureState();
          handStatesRef.current.set(hand.hand, state);
        }
        const wrist = hand.points[0]!;

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
        }
        eyesClosedSinceRef.current = null;
      }

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
        currentGestureRef.current = null;
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
        handStatesRef.current = new Map();
        lastGestureEmittedRef.current = new Map();
        prevPosePointsRef.current = null;
        repCycleRef.current = freshRepCycleState();

        sessionStartedAtRef.current = new Date();
        lifetimeFrameCountRef.current = 0;
        lifetimeFacePresentFramesRef.current = 0;
        lifetimeBlinkCountRef.current = 0;
        lifetimeGestureCountRef.current = 0;
        lifetimeExerciseSetCountRef.current = 0;
        lifetimeRepsTotalRef.current = 0;
        currentGestureRef.current = null;
        handVisibleRef.current = { left: false, right: false };
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
