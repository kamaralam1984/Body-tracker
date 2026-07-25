import type { HandTrackingResult, TrackingPoint } from "../../types";
import { depthStyleOf, segmentDepthStyle } from "./depth-scale";
import type { TrackingColorPair } from "./resolve-tracking-colors";

const LINE_WIDTH = 2;
const JOINT_RADIUS = 2.5;
const TIP_RADIUS = 3.75;

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
 * handedness isn't a color-coded fact in this product) with connection
 * lines and joint dots scaled by each landmark's depth (`z`) — a hand
 * reaching toward the camera renders thicker/fuller-opacity than one
 * reaching away, see depth-scale.ts. Fingertips additionally get a touch
 * more size and brightness ("beautiful joint rendering") to read as the
 * expressive part of the hand.
 *
 * Depth-varying width means a stroke/fill call per segment/joint rather
 * than one batched path — still cheap at hand landmark counts (21 points,
 * up to 2 hands) at 60fps.
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

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Pass 1: connection segments for every hand, each depth-scaled.
  ctx.strokeStyle = colors.hand.line;
  for (const hand of hands) {
    for (const [a, b] of hand.segments) {
      const [ax, ay] = toPx(a);
      const [bx, by] = toPx(b);
      const { widthScale, alphaScale } = segmentDepthStyle(a, b);
      ctx.lineWidth = LINE_WIDTH * widthScale;
      ctx.globalAlpha = alphaScale;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }

  // Pass 2: regular joints (all points except fingertips), depth-scaled.
  ctx.fillStyle = colors.hand.point;
  for (const hand of hands) {
    hand.points.forEach((point, index) => {
      if (FINGERTIP_INDICES.has(index)) return;
      const [x, y] = toPx(point);
      const { widthScale, alphaScale } = depthStyleOf(point.z);
      const radius = JOINT_RADIUS * widthScale;
      ctx.globalAlpha = alphaScale;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Pass 3: fingertips, slightly larger and brighter, still depth-scaled.
  ctx.fillStyle = colors.handTip.point;
  for (const hand of hands) {
    hand.points.forEach((point, index) => {
      if (!FINGERTIP_INDICES.has(index)) return;
      const [x, y] = toPx(point);
      const { widthScale, alphaScale } = depthStyleOf(point.z);
      const radius = TIP_RADIUS * widthScale;
      ctx.globalAlpha = alphaScale;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.globalAlpha = 1;
}
