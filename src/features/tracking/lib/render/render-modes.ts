/**
 * Alternate visualization modes for the tracking overlay — additive to the
 * default "skeleton" rendering in `draw-face.ts`/`draw-hand.ts`/`draw-pose.ts`
 * (left completely untouched), switched in `tracking-canvas.tsx`. These are
 * deliberately simple/debug-flavored, unlike the tuned skeleton look.
 *
 * Honesty note: face/hand landmarks carry no real per-point confidence
 * (`TrackingPoint.visibility` is `undefined` for both — only pose reports
 * it), so "confidence" mode only actually varies color for pose; face/hand
 * fall back to a flat tint rather than a fabricated gradient.
 */

import type { TrackingFrame, TrackingPoint } from "../../types";
import type { TrackingColors } from "./resolve-tracking-colors";

export type RenderMode =
  "camera-only" | "skeleton" | "wireframe" | "landmark-ids" | "bounding-box" | "confidence";

const DOT_RADIUS = 1.5;
const LABEL_FONT = "9px monospace";

function toPx(p: TrackingPoint, width: number, height: number): [number, number] {
  return [p.x * width, p.y * height];
}

export function boundsOf(
  points: TrackingPoint[],
): { x: number; y: number; w: number; h: number } | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function allSubjects(frame: TrackingFrame): { label: string; points: TrackingPoint[] }[] {
  const subjects: { label: string; points: TrackingPoint[] }[] = [];
  if (frame.face) subjects.push({ label: "Face", points: frame.face.points });
  for (const hand of frame.hands) {
    subjects.push({
      label: hand.hand === "left" ? "Left hand" : "Right hand",
      points: hand.points,
    });
  }
  if (frame.pose) subjects.push({ label: "Pose", points: frame.pose.points });
  return subjects;
}

export function drawWireframe(
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  width: number,
  height: number,
  colors: TrackingColors,
): void {
  for (const subject of allSubjects(frame)) {
    ctx.fillStyle = subject.label === "Pose" ? colors.pose.point : colors.face.point;
    for (const point of subject.points) {
      const [x, y] = toPx(point, width, height);
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Face has ~478 landmarks — index labels for every one would be unreadable
// clutter, so this mode only labels hand (21 points) and pose (33 points),
// while still drawing face as plain dots for context.
export function drawLandmarkIds(
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  width: number,
  height: number,
  colors: TrackingColors,
): void {
  if (frame.face) {
    ctx.fillStyle = colors.face.point;
    for (const point of frame.face.points) {
      const [x, y] = toPx(point, width, height);
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.font = LABEL_FONT;
  for (const hand of frame.hands) {
    ctx.fillStyle = colors.hand.point;
    hand.points.forEach((point, index) => {
      const [x, y] = toPx(point, width, height);
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(String(index), x + 3, y - 3);
    });
  }

  if (frame.pose) {
    ctx.fillStyle = colors.pose.point;
    frame.pose.points.forEach((point, index) => {
      const [x, y] = toPx(point, width, height);
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(String(index), x + 3, y - 3);
    });
  }
}

export function drawBoundingBoxes(
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  width: number,
  height: number,
  colors: TrackingColors,
): void {
  ctx.lineWidth = 1.5;
  ctx.font = LABEL_FONT;

  for (const subject of allSubjects(frame)) {
    const bounds = boundsOf(subject.points);
    if (!bounds) continue;
    const x = bounds.x * width;
    const y = bounds.y * height;
    const w = bounds.w * width;
    const h = bounds.h * height;

    ctx.strokeStyle = subject.label === "Pose" ? colors.pose.line : colors.hand.line;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(subject.label, x + 2, y - 4 < 8 ? y + 10 : y - 4);
  }
}

const CONFIDENCE_LOW = "oklch(0.6 0.2 25)"; // red-ish
const CONFIDENCE_HIGH = "oklch(0.6 0.15 152)"; // green-ish (matches success/pose hue)

export function drawConfidenceOverlay(
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  width: number,
  height: number,
  colors: TrackingColors,
): void {
  // Pose has real per-point visibility — color-code it directly.
  if (frame.pose) {
    for (const point of frame.pose.points) {
      const [x, y] = toPx(point, width, height);
      const confidence = point.visibility ?? 0.5;
      ctx.fillStyle = confidence >= 0.6 ? CONFIDENCE_HIGH : CONFIDENCE_LOW;
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Face/hand landmarks carry no real per-point confidence — flat tint, not
  // a fabricated gradient (see file header).
  if (frame.face) {
    ctx.fillStyle = colors.face.point;
    for (const point of frame.face.points) {
      const [x, y] = toPx(point, width, height);
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const hand of frame.hands) {
    ctx.fillStyle = colors.hand.point;
    for (const point of hand.points) {
      const [x, y] = toPx(point, width, height);
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
