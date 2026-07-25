import type { HandTrackingResult, TrackingPoint } from "../../types";
import type { TrackingColorPair } from "./resolve-tracking-colors";

const LINE_WIDTH = 1.5;
const JOINT_RADIUS = 2;
const TIP_RADIUS = 3;

// Standard MediaPipe hand landmark indices for the five fingertips. The
// `points` array preserves MediaPipe's original landmark ordering (see
// `tracking-engine.ts#processHands`), so these indices are stable.
const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20]);

export interface DrawHandColors {
  hand: TrackingColorPair;
  /** Slightly emphasized treatment for fingertip points. */
  handTip: TrackingColorPair;
}

/**
 * Draws every tracked hand (left and right share the same restrained color —
 * handedness isn't a color-coded fact in this product) with thin, soft
 * connection lines and small joint dots. Fingertips get a touch more size
 * and brightness ("beautiful joint rendering") to read as the expressive
 * part of the hand.
 *
 * Draws are batched into three paths total across ALL hands in the frame
 * (connections, regular joints, fingertips), not per-hand or per-segment.
 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  hands: HandTrackingResult[],
  width: number,
  height: number,
  colors: DrawHandColors,
): void {
  if (hands.length === 0) return;
  const toPx = (p: TrackingPoint): [number, number] => [p.x * width, p.y * height];

  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Pass 1: connection segments for every hand.
  ctx.beginPath();
  for (const hand of hands) {
    for (const [a, b] of hand.segments) {
      const [ax, ay] = toPx(a);
      const [bx, by] = toPx(b);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
  }
  ctx.strokeStyle = colors.hand.line;
  ctx.stroke();

  // Pass 2: regular joints (all points except fingertips).
  ctx.beginPath();
  for (const hand of hands) {
    hand.points.forEach((point, index) => {
      if (FINGERTIP_INDICES.has(index)) return;
      const [x, y] = toPx(point);
      ctx.moveTo(x + JOINT_RADIUS, y);
      ctx.arc(x, y, JOINT_RADIUS, 0, Math.PI * 2);
    });
  }
  ctx.fillStyle = colors.hand.point;
  ctx.fill();

  // Pass 3: fingertips, slightly larger and brighter.
  ctx.beginPath();
  for (const hand of hands) {
    hand.points.forEach((point, index) => {
      if (!FINGERTIP_INDICES.has(index)) return;
      const [x, y] = toPx(point);
      ctx.moveTo(x + TIP_RADIUS, y);
      ctx.arc(x, y, TIP_RADIUS, 0, Math.PI * 2);
    });
  }
  ctx.fillStyle = colors.handTip.point;
  ctx.fill();
}
