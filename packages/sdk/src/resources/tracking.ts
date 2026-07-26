import type { KvlClient } from "../client";
import type { Session } from "./types";

/**
 * Same hyphenated wire spelling as the real API (`toApiEventType` /
 * `toPrismaEventType` in `tracking-service.ts` convert Prisma's
 * underscored `form_alert` to `"form-alert"` at the HTTP boundary — every
 * event this SDK ever receives has already crossed that boundary).
 */
export type TrackingEventType =
  | "started"
  | "paused"
  | "resumed"
  | "rep"
  | "form-alert"
  | "completed"
  | "distraction"
  | "drowsiness_alert"
  | "gesture";

/** A single `TrackingEvent` row, as appended by the tracking routes (session lifecycle, reps, ingested metric-window events). */
export interface TrackingEvent {
  id: string;
  sessionId: string;
  type: TrackingEventType;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
}

/** Response of `GET /tracking/{sessionId}/status`. */
export interface TrackingStatusResult {
  session: Session;
  recentEvents: TrackingEvent[];
}

export interface RecordRepInput {
  /** 0-100. When provided, rolls into the session's running `avgFormScore` and — below 50 — also appends a `form-alert` event. */
  formScore?: number;
}

/** Same 7 literals as the browser's gesture classifier ("hand" tracking mode only). */
export type GestureType =
  "wave" | "raise-hand" | "point" | "thumbs-up" | "pinch" | "open-palm" | "closed-hand";

/** One of the (at most 20) discrete events tallied client-side within a metrics window, submitted alongside the window aggregate. */
export interface RecordMetricsEventInput {
  type: "distraction" | "drowsiness_alert" | "gesture";
  message: string;
  durationSeconds?: number;
  gestureType?: GestureType;
}

/**
 * One ~10s window of client-tallied face-tracking aggregates (never raw
 * landmarks). Movement fields are only meaningful when "pose" tracking
 * mode is on for this window.
 */
export interface RecordMetricsInput {
  windowStart: string;
  windowEnd: string;
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
  motionEnergy?: number;
  lowerBodyVisible?: boolean;
  gaitCadencePerMin?: number;
  events?: RecordMetricsEventInput[];
}

export type MovementState = "sitting" | "standing" | "walking" | "running" | "idle";

/** A stored `TrackingMetricSample` row — the ingested aggregate plus the server-computed scores. */
export interface TrackingMetricSample {
  id: string;
  orgId: string;
  userId: string;
  sessionId: string;
  windowStart: string;
  windowEnd: string;
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
  attentionScore: number;
  postureScore: number;
  fatigueScore: number;
  motionEnergy: number | null;
  lowerBodyVisible: boolean | null;
  gaitCadencePerMin: number | null;
  movementState: MovementState | null;
  createdAt: string;
}

export interface RecordExerciseSetInput {
  /** Defaults server-side to "Movement set" — there's no trained per-exercise classifier, so a specific name is never fabricated. */
  exerciseName?: string;
  reps: number;
  durationSeconds: number;
}

/** A stored `ExerciseSet` row — one completed burst of repetitive motion, auto-detected client-side from pose landmarks. */
export interface ExerciseSet {
  id: string;
  orgId: string;
  userId: string;
  sessionId: string;
  exerciseName: string;
  reps: number;
  durationSeconds: number;
  caloriesEstimate: number;
  createdAt: string;
}

/**
 * `client.tracking` — the live tracking lifecycle for a session
 * (start/pause/resume/stop/status) plus ingestion of reps, metric
 * windows, and exercise sets. Mirrors
 * `POST|GET /api/v1/tracking/{sessionId}/*`. The SSE stream endpoint
 * (`/tracking/{sessionId}/stream`) is intentionally not wrapped here —
 * see the dedicated real-time module.
 */
export class TrackingResource {
  constructor(private client: KvlClient) {}

  /** Transitions an idle session to active and stamps `startedAt`. Mirrors `POST /tracking/{sessionId}/start`. */
  start(sessionId: string): Promise<Session> {
    return this.client.request({ method: "POST", path: `/tracking/${sessionId}/start` });
  }

  /** Transitions an active session to paused and stamps `pausedAt`. Mirrors `POST /tracking/{sessionId}/pause`. */
  pause(sessionId: string): Promise<Session> {
    return this.client.request({ method: "POST", path: `/tracking/${sessionId}/pause` });
  }

  /** Transitions a paused session back to active and clears `pausedAt`. Mirrors `POST /tracking/{sessionId}/resume`. */
  resume(sessionId: string): Promise<Session> {
    return this.client.request({ method: "POST", path: `/tracking/${sessionId}/resume` });
  }

  /** Transitions an active or paused session to completed, computing final `durationSeconds` and recording the completion into analytics. Mirrors `POST /tracking/{sessionId}/stop`. */
  stop(sessionId: string): Promise<Session> {
    return this.client.request({ method: "POST", path: `/tracking/${sessionId}/stop` });
  }

  /** Fetches the session plus its 20 most recent tracking events. Mirrors `GET /tracking/{sessionId}/status`. */
  status(sessionId: string): Promise<TrackingStatusResult> {
    return this.client.request({ method: "GET", path: `/tracking/${sessionId}/status` });
  }

  /** Records one completed rep on an active session, rolling `formScore` (if given) into the running `avgFormScore`. Mirrors `POST /tracking/{sessionId}/rep`. */
  recordRep(sessionId: string, input: RecordRepInput = {}): Promise<Session> {
    return this.client.request({ method: "POST", path: `/tracking/${sessionId}/rep`, body: input });
  }

  /** Ingests one ~10s window of tallied face-tracking (and optionally pose) aggregates; scores are computed server-side. Mirrors `POST /tracking/{sessionId}/metrics`. */
  recordMetrics(sessionId: string, input: RecordMetricsInput): Promise<TrackingMetricSample> {
    return this.client.request({
      method: "POST",
      path: `/tracking/${sessionId}/metrics`,
      body: input,
    });
  }

  /** Records one completed exercise set (auto-detected rep burst) on an active session, incrementing the session's `repCount`/`caloriesEstimate`. Mirrors `POST /tracking/{sessionId}/exercise-set`. */
  recordExerciseSet(sessionId: string, input: RecordExerciseSetInput): Promise<ExerciseSet> {
    return this.client.request({
      method: "POST",
      path: `/tracking/${sessionId}/exercise-set`,
      body: input,
    });
  }
}
