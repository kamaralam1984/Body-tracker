import type { PoseTrackingResult, TrackingPoint } from "../../types";
import type { TrackingColorPair } from "./resolve-tracking-colors";

const LINE_WIDTH = 1.5;
const JOINT_RADIUS = 2.5;

export interface DrawPoseColors {
  pose: TrackingColorPair;
}

/**
 * Draws the tracked pose skeleton with thin, soft connection lines and
 * small joint dots. Connections are literal `lineTo` segments — that's how
 * MediaPipe's connection data is shaped — kept visually soft via line
 * width/opacity rather than spline-curved, which would be over-engineering
 * for this scale.
 *
 * Draws are batched into two paths total (all connections, all joints)
 * regardless of segment/point count.
 */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  pose: PoseTrackingResult,
  width: number,
  height: number,
  colors: DrawPoseColors,
): void {
  const toPx = (p: TrackingPoint): [number, number] => [p.x * width, p.y * height];

  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  for (const [a, b] of pose.segments) {
    const [ax, ay] = toPx(a);
    const [bx, by] = toPx(b);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.strokeStyle = colors.pose.line;
  ctx.stroke();

  ctx.beginPath();
  for (const point of pose.points) {
    const [x, y] = toPx(point);
    ctx.moveTo(x + JOINT_RADIUS, y);
    ctx.arc(x, y, JOINT_RADIUS, 0, Math.PI * 2);
  }
  ctx.fillStyle = colors.pose.point;
  ctx.fill();
}
