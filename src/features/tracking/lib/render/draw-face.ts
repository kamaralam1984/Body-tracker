import type { FaceContourName, FaceTrackingResult, TrackingPoint } from "../../types";
import type { TrackingColorPair } from "./resolve-tracking-colors";

const LINE_WIDTH = 1.5;
const IRIS_POINT_RADIUS = 2.5;

const IRIS_CONTOURS = new Set<FaceContourName>(["leftIris", "rightIris"]);

export interface DrawFaceColors {
  face: TrackingColorPair;
  /** Slightly brighter tint used for the iris contours + centers. */
  faceAccent: TrackingColorPair;
}

/**
 * Draws a soft face outline from pre-computed contour segments — never the
 * full landmark mesh, so this reads as a gentle silhouette, not a debug
 * mesh grid. Iris contours get a touch of life via a slightly brighter tint
 * plus a small filled center dot; every other contour is line-only.
 *
 * Draws are batched into two paths total (regular contours, iris contours)
 * plus one fill for the iris center dots, regardless of how many segments
 * exist, to keep this cheap at 60fps.
 */
export function drawFace(
  ctx: CanvasRenderingContext2D,
  face: FaceTrackingResult,
  width: number,
  height: number,
  colors: DrawFaceColors,
): void {
  const toPx = (p: TrackingPoint): [number, number] => [p.x * width, p.y * height];

  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Pass 1: every non-iris contour, one batched stroke.
  ctx.beginPath();
  for (const contour of face.contours) {
    if (IRIS_CONTOURS.has(contour.name)) continue;
    for (const [a, b] of contour.segments) {
      const [ax, ay] = toPx(a);
      const [bx, by] = toPx(b);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
  }
  ctx.strokeStyle = colors.face.line;
  ctx.stroke();

  // Pass 2: iris contours, brighter tint, plus a small center dot per eye.
  const irisCenters: [number, number][] = [];
  ctx.beginPath();
  for (const contour of face.contours) {
    if (!IRIS_CONTOURS.has(contour.name)) continue;
    if (contour.segments.length === 0) continue;

    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const [a, b] of contour.segments) {
      const [ax, ay] = toPx(a);
      const [bx, by] = toPx(b);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      sumX += ax + bx;
      sumY += ay + by;
      count += 2;
    }
    if (count > 0) irisCenters.push([sumX / count, sumY / count]);
  }
  ctx.strokeStyle = colors.faceAccent.line;
  ctx.stroke();

  if (irisCenters.length > 0) {
    ctx.beginPath();
    for (const [cx, cy] of irisCenters) {
      ctx.moveTo(cx + IRIS_POINT_RADIUS, cy);
      ctx.arc(cx, cy, IRIS_POINT_RADIUS, 0, Math.PI * 2);
    }
    ctx.fillStyle = colors.faceAccent.point;
    ctx.fill();
  }
}
