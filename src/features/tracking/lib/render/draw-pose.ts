import type { PoseTrackingResult, TrackingPoint } from "../../types";
import { depthStyleOf, segmentDepthStyle } from "./depth-scale";
import type { TrackingColorPair } from "./resolve-tracking-colors";

const LINE_WIDTH = 2.25;
const JOINT_RADIUS = 3;

export interface DrawPoseColors {
  pose: TrackingColorPair;
}

/**
 * Draws the tracked pose skeleton with connection lines and joint dots,
 * each scaled by that landmark's depth (`z`) — limbs reaching toward the
 * camera render thicker/fuller-opacity, ones reaching away render
 * thinner/fainter, so the 2D overlay reads with a sense of the body's
 * actual 3D pose instead of a flat wireframe. See depth-scale.ts.
 *
 * Depth-varying width means each segment/joint needs its own stroke/fill
 * call (canvas can't vary lineWidth within one path) — still cheap at
 * pose's landmark count (~33 connections) at 60fps.
 */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  pose: PoseTrackingResult,
  width: number,
  height: number,
  colors: DrawPoseColors,
): void {
  const toPx = (p: TrackingPoint): [number, number] => [p.x * width, p.y * height];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = colors.pose.line;

  for (const [a, b] of pose.segments) {
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

  ctx.fillStyle = colors.pose.point;
  for (const point of pose.points) {
    const [x, y] = toPx(point);
    const { widthScale, alphaScale } = depthStyleOf(point.z);
    const radius = JOINT_RADIUS * widthScale;
    ctx.globalAlpha = alphaScale;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
