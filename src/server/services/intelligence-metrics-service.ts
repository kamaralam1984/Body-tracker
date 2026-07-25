/**
 * Deterministic, rule-based scoring for the Attention / Posture / Wellness
 * dashboards — same "no AI/ML branding" convention as `analytics-service.ts`:
 * nothing here is a model, a prediction, or a generated guess. Every score
 * is a plain, documented formula over aggregates the browser already tallied
 * from real face-tracking (see `src/features/tracking/hooks/use-tracking-session-sync.ts`).
 *
 * Scores are computed **server-side** from the raw per-window aggregate the
 * client reports (the client only tallies counts/sums, never asserts its
 * own score) — so the formulas below can be retuned without a client
 * redeploy, and a modified client can't just report a flattering score
 * directly.
 *
 * Phase 1 is face-tracking-only (no shoulder/torso signal), so posture and
 * body-fatigue are head-pose proxies, not independent body tracking — see
 * the per-field comments below for exactly what each number really measures.
 */

export interface RawWindowAggregate {
  windowStart: Date;
  windowEnd: Date;
  frameCount: number;
  facePresentFrames: number;
  blinkCount: number;
  eyesClosedFrameCount: number;
  longEyeClosureCount: number;
  avgHeadYawDev: number;
  avgHeadPitchDev: number;
  avgHeadRollDev: number;
  yawStdDev: number;
  pitchStdDev: number;
  rollStdDev: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function windowMinutes(agg: RawWindowAggregate): number {
  const ms = agg.windowEnd.getTime() - agg.windowStart.getTime();
  return Math.max(ms / 60_000, 1 / 60);
}

// --- Attention -------------------------------------------------------------

const EXPECTED_BLINK_RATE_PER_MIN = 17; // typical resting blink rate is ~15-20/min
const BLINK_RATE_TOLERANCE = 20;
const HEAD_STABILITY_SCALE_DEG = 15; // avg(yaw/pitch stddev) at which stability -> 0

/**
 * 0-100: weighted blend of face-presence (in frame at all), head stability
 * (low yaw/pitch variance = looking steadily at the screen), and blink-rate
 * normalcy (unusually high or low blink rates both reduce the score).
 */
export function computeAttentionScore(agg: RawWindowAggregate): number {
  const presenceFraction = clamp(agg.facePresentFrames / agg.frameCount, 0, 1);
  const blinkRate = agg.blinkCount / windowMinutes(agg);
  const blinkNormalcy =
    1 - clamp(Math.abs(blinkRate - EXPECTED_BLINK_RATE_PER_MIN) / BLINK_RATE_TOLERANCE, 0, 1);
  const headStability =
    1 - clamp((agg.yawStdDev + agg.pitchStdDev) / 2 / HEAD_STABILITY_SCALE_DEG, 0, 1);

  const score = 0.5 * presenceFraction + 0.3 * headStability + 0.2 * blinkNormalcy;
  return round(100 * clamp(score, 0, 1));
}

// --- Posture -----------------------------------------------------------------

const PITCH_TOLERANCE_DEG = 20; // forward/back head tilt ("tech neck") tolerance
const ROLL_TOLERANCE_DEG = 15; // sideways head tilt tolerance

/**
 * 0-100: head pitch/roll deviation from the session's calibrated neutral
 * baseline (see the sync hook — the client sends deviations already
 * relative to that baseline, the server never sees the raw angles).
 * Pitch dominates (forward head droop is the most common desk-posture
 * problem a single webcam can actually see); roll contributes less.
 */
export function computePostureScore(agg: RawWindowAggregate): number {
  const pitchPenalty = clamp(Math.abs(agg.avgHeadPitchDev) / PITCH_TOLERANCE_DEG, 0, 1);
  const rollPenalty = clamp(Math.abs(agg.avgHeadRollDev) / ROLL_TOLERANCE_DEG, 0, 1);
  const score = 1 - 0.6 * pitchPenalty - 0.4 * rollPenalty;
  return round(100 * clamp(score, 0, 1));
}

/**
 * `PostureSnapshot` exposes 4 independent-looking dimensions
 * (shoulder/head/neck/balance), but Phase 1 only has 3 head-rotation axes
 * to work with — no shoulder/torso tracking. Rather than fabricate 4
 * independent numbers, each dimension maps to the axis it best correlates
 * with in a single-webcam desk setup: pitch (forward/back head droop) is
 * literally neck/head angle; roll (sideways head tilt) correlates with
 * shoulder unevenness; sustained yaw drift suggests desk/chair misalignment
 * ("balance"). Two dimensions share the same underlying number by design.
 */
export function pitchAlignmentScore(avgHeadPitchDev: number): number {
  return round(100 * clamp(1 - Math.abs(avgHeadPitchDev) / PITCH_TOLERANCE_DEG, 0, 1));
}

export function rollAlignmentScore(avgHeadRollDev: number): number {
  return round(100 * clamp(1 - Math.abs(avgHeadRollDev) / ROLL_TOLERANCE_DEG, 0, 1));
}

export function yawBalanceScore(yawStdDev: number): number {
  return round(100 * clamp(1 - yawStdDev / HEAD_STABILITY_SCALE_DEG, 0, 1));
}

/** Overall head-pose steadiness across yaw/pitch/roll — `PostureSnapshot.stability`. */
export function stabilityScoreOf(avgStdDev: number): number {
  return round(100 * clamp(1 - avgStdDev / HEAD_STABILITY_SCALE_DEG, 0, 1));
}

// --- Fatigue / wellness ------------------------------------------------------

const PERCLOS_SCALE = 0.3; // fraction of time eyes-closed at which fatigue -> 0
const LONG_CLOSURE_RATE_SCALE = 2; // long closures/min at which fatigue -> 0

/**
 * 0-100: PERCLOS-style (percentage of eye closure) — the same category of
 * proxy real driver-drowsiness-monitoring products use, not a clinical
 * measurement. Combines fraction-of-time-eyes-closed with the rate of
 * "long" closures (>= LONG_CLOSURE_MS in the sync hook, well past a normal
 * 100-400ms blink) — a genuine microsleep signal.
 */
export function computeFatigueScore(agg: RawWindowAggregate): number {
  const perclos = clamp(agg.eyesClosedFrameCount / agg.frameCount, 0, 1);
  const longClosureRate = agg.longEyeClosureCount / windowMinutes(agg);
  const score =
    1 -
    0.7 * clamp(perclos / PERCLOS_SCALE, 0, 1) -
    0.3 * clamp(longClosureRate / LONG_CLOSURE_RATE_SCALE, 0, 1);
  return round(100 * clamp(score, 0, 1));
}

// --- Qualitative buckets, for the read-side snapshot APIs -------------------
// Thresholds match the ones the (still-mock) Movement/Forecast/Insights
// pages already established, so the UI's calibration stays consistent
// whether a number came from real or demo data.

export type EngagementLevel = "highly-engaged" | "engaged" | "moderately-engaged" | "distracted";

export function engagementOf(attentionScore: number): EngagementLevel {
  if (attentionScore >= 82) return "highly-engaged";
  if (attentionScore >= 65) return "engaged";
  if (attentionScore >= 45) return "moderately-engaged";
  return "distracted";
}

export type AlignmentQuality = "excellent" | "good" | "fair" | "needs-improvement";

/** Maps a 0-100 sub-score to the 4-tier vocabulary `PostureSnapshot` uses. */
export function alignmentQualityOf(score: number): AlignmentQuality {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "needs-improvement";
}

export type EnergyLevel = "high" | "moderate" | "low";
export type FatigueLevel = "low" | "moderate" | "high";
export type DrowsinessStatus = "alert" | "slightly-tired" | "drowsy";

export function energyLevelOf(fatigueScore: number): EnergyLevel {
  if (fatigueScore >= 70) return "high";
  if (fatigueScore >= 45) return "moderate";
  return "low";
}

export function fatigueLevelOf(fatigueScore: number): FatigueLevel {
  if (fatigueScore >= 70) return "low";
  if (fatigueScore >= 45) return "moderate";
  return "high";
}

export function drowsinessStatusOf(fatigueScore: number): DrowsinessStatus {
  if (fatigueScore >= 65) return "alert";
  if (fatigueScore >= 40) return "slightly-tired";
  return "drowsy";
}

// --- Distraction / microsleep event thresholds ------------------------------
// Shared with the client-side sync hook so both sides agree on what counts
// as a discrete event, not just a score dip.

export const FACE_LOST_DISTRACTION_MS = 3000;
export const YAW_EXCURSION_DEG = 30;
export const YAW_EXCURSION_MS = 2500;
export const LONG_CLOSURE_MS = 500; // eye closure this long or longer = microsleep proxy, not a normal blink

// --- Movement pattern (Phase 2, "pose" mode only) ---------------------------
//
// Sitting/standing are plausible from a desk webcam; walking/running need
// the lower body to actually be visible AND moving, which is rare for a
// laptop-camera desk setup — this will correctly show near-zero minutes for
// those two states in typical use. That's the honest result of the input
// signal, not a bug to compensate for.

export type MovementState = "sitting" | "standing" | "walking" | "running" | "idle";

export interface RawMovementAggregate {
  motionEnergy: number; // avg per-frame displacement across visible pose points (normalized coordinate units)
  lowerBodyVisible: boolean; // hips/knees/ankles above the visibility threshold this window
  gaitCadencePerMin: number; // zero-crossing rate of hip x-position, extrapolated to a per-minute rate; 0 if not periodic
}

const MOTION_ENERGY_IDLE_THRESHOLD = 0.002; // below this, essentially motionless
const WALKING_CADENCE_PER_MIN = 30; // periodic hip oscillation at or above this rate reads as gait, not fidgeting
const RUNNING_CADENCE_PER_MIN = 90;

/**
 * One dominant state per ~10s window, computed server-side from the client's
 * tallied motion/visibility/periodicity aggregate — same "client tallies,
 * server classifies" principle as attention/posture/fatigue above.
 */
export function classifyMovementState(agg: RawMovementAggregate): MovementState {
  if (agg.motionEnergy < MOTION_ENERGY_IDLE_THRESHOLD) return "idle";
  if (agg.gaitCadencePerMin >= RUNNING_CADENCE_PER_MIN) return "running";
  if (agg.gaitCadencePerMin >= WALKING_CADENCE_PER_MIN) return "walking";
  return agg.lowerBodyVisible ? "standing" : "sitting";
}

// --- Activity quality (Phase 2 trend) ---------------------------------------

/**
 * 0-100 "how engaged and active was this day" proxy — there's no independent
 * movement-quality signal without deep per-rep form analysis (that's what a
 * real per-set `formScore` is for), so this blends attention with how much
 * of the tracked time was actively spent (not idle).
 */
export function computeActivityQualityScore(
  attentionScore: number,
  activeFraction: number,
): number {
  const score = 0.6 * (attentionScore / 100) + 0.4 * clamp(activeFraction, 0, 1);
  return round(100 * clamp(score, 0, 1));
}
