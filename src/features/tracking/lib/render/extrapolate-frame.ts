import type {
  FaceTrackingResult,
  HandTrackingResult,
  PoseTrackingResult,
  TrackingFrame,
  TrackingPoint,
} from "../../types";

/**
 * Detection runs at whatever rate the enabled landmarkers can sustain
 * (~14fps with face+hand+pose all active on modest hardware), but the
 * canvas redraws at the display's real rate via `requestAnimationFrame`
 * (~60fps). Redrawing the same detected frame repeatedly between updates
 * reads as stepped/laggy motion, not smooth tracking.
 *
 * This linearly extrapolates every point forward from the last two
 * detected frames — `curr + (curr - prev) * alpha` — using the caller's
 * measured time since `curr` arrived as `alpha` (capped to at most one
 * detection interval, see `tracking-canvas.tsx`). At `alpha = 0` this is
 * exactly `curr`; a fresh detection always snaps to ground truth with zero
 * discontinuity, and prediction never runs further ahead than the gap
 * between two real samples, so a subject leaving frame or detection
 * stalling can't cause runaway drift into empty space.
 *
 * Falls back to returning `curr` untouched whenever `prev`'s shape doesn't
 * line up with `curr` (different hand present, tracking just (re)started,
 * a component went from null to detected) — extrapolating between
 * unrelated landmarks would produce a visible snap/glitch, which is worse
 * than the one-interval-old-but-coherent position `curr` already is.
 */
export function extrapolateTrackingFrame(
  prev: TrackingFrame | null,
  curr: TrackingFrame,
  alpha: number,
): TrackingFrame {
  if (!prev || alpha <= 0) return curr;
  const a = Math.min(alpha, 1);

  return {
    timestampMs: curr.timestampMs,
    face: extrapolateFace(prev.face, curr.face, a),
    hands: extrapolateHands(prev.hands, curr.hands, a),
    pose: extrapolatePose(prev.pose, curr.pose, a),
    faceCount: curr.faceCount,
  };
}

function extrapolatePoint(prev: TrackingPoint, curr: TrackingPoint, alpha: number): TrackingPoint {
  return {
    x: curr.x + (curr.x - prev.x) * alpha,
    y: curr.y + (curr.y - prev.y) * alpha,
    z: curr.z !== undefined && prev.z !== undefined ? curr.z + (curr.z - prev.z) * alpha : curr.z,
    visibility: curr.visibility,
  };
}

function extrapolatePoints(
  prev: TrackingPoint[],
  curr: TrackingPoint[],
  alpha: number,
): TrackingPoint[] {
  if (prev.length !== curr.length) return curr;
  return curr.map((point, i) => extrapolatePoint(prev[i]!, point, alpha));
}

function extrapolateSegments(
  prev: [TrackingPoint, TrackingPoint][],
  curr: [TrackingPoint, TrackingPoint][],
  alpha: number,
): [TrackingPoint, TrackingPoint][] {
  if (prev.length !== curr.length) return curr;
  return curr.map(([a, b], i) => {
    const prevPair = prev[i]!;
    return [extrapolatePoint(prevPair[0], a, alpha), extrapolatePoint(prevPair[1], b, alpha)];
  });
}

function extrapolateFace(
  prev: FaceTrackingResult | null,
  curr: FaceTrackingResult | null,
  alpha: number,
): FaceTrackingResult | null {
  if (!curr || !prev) return curr;
  if (prev.contours.length !== curr.contours.length) return curr;

  return {
    ...curr,
    points: extrapolatePoints(prev.points, curr.points, alpha),
    contours: curr.contours.map((contour, i) => {
      const prevContour = prev.contours[i]!;
      if (prevContour.name !== contour.name) return contour;
      return {
        ...contour,
        segments: extrapolateSegments(prevContour.segments, contour.segments, alpha),
      };
    }),
  };
}

function extrapolateHands(
  prev: HandTrackingResult[],
  curr: HandTrackingResult[],
  alpha: number,
): HandTrackingResult[] {
  return curr.map((hand) => {
    const prevHand = prev.find((h) => h.hand === hand.hand);
    if (!prevHand || prevHand.points.length !== hand.points.length) return hand;
    return {
      ...hand,
      points: extrapolatePoints(prevHand.points, hand.points, alpha),
      segments: extrapolateSegments(prevHand.segments, hand.segments, alpha),
    };
  });
}

function extrapolatePose(
  prev: PoseTrackingResult | null,
  curr: PoseTrackingResult | null,
  alpha: number,
): PoseTrackingResult | null {
  if (!curr || !prev || prev.points.length !== curr.points.length) return curr;
  return {
    points: extrapolatePoints(prev.points, curr.points, alpha),
    segments: extrapolateSegments(prev.segments, curr.segments, alpha),
  };
}
