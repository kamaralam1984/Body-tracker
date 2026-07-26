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

import { drawFace } from "./draw-face";
import { drawHand } from "./draw-hand";
import { drawPose } from "./draw-pose";
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

// Reused across frames/calls rather than allocated fresh each time (this
// runs at detection rate, up to ~30fps) — resized only when the mask's own
// resolution changes, which it never does mid-session.
let maskScratchCanvas: HTMLCanvasElement | null = null;

/**
 * Renders the real per-pixel confidence mask as a translucent tint —
 * `fillStyle` takes the design system's color directly (oklch/color-mix
 * strings work natively, see resolve-tracking-colors.ts's header comment),
 * then a `destination-in` composite modulates each pixel's alpha by the
 * mask's own confidence value, so opacity genuinely tracks the model's
 * output instead of being a flat highlight.
 */
export function drawSegmentationMask(
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  width: number,
  height: number,
  colors: TrackingColors,
): void {
  const segmentation = frame.segmentation;
  if (!segmentation) return;
  const { maskWidth, maskHeight, confidenceMask } = segmentation;

  if (!maskScratchCanvas) maskScratchCanvas = document.createElement("canvas");
  if (maskScratchCanvas.width !== maskWidth || maskScratchCanvas.height !== maskHeight) {
    maskScratchCanvas.width = maskWidth;
    maskScratchCanvas.height = maskHeight;
  }
  const maskCtx = maskScratchCanvas.getContext("2d");
  if (!maskCtx) return;

  maskCtx.globalCompositeOperation = "source-over";
  maskCtx.fillStyle = colors.segmentationTint;
  maskCtx.fillRect(0, 0, maskWidth, maskHeight);

  const alphaLayer = maskCtx.createImageData(maskWidth, maskHeight);
  for (let i = 0; i < confidenceMask.length; i++) {
    const alpha = Math.round(Math.min(1, Math.max(0, confidenceMask[i]!)) * 255);
    const offset = i * 4;
    alphaLayer.data[offset] = 255;
    alphaLayer.data[offset + 1] = 255;
    alphaLayer.data[offset + 2] = 255;
    alphaLayer.data[offset + 3] = alpha;
  }
  maskCtx.globalCompositeOperation = "destination-in";
  maskCtx.putImageData(alphaLayer, 0, 0);

  ctx.drawImage(maskScratchCanvas, 0, 0, maskWidth, maskHeight, 0, 0, width, height);
}

/** Real bounding boxes + category label + confidence % — genuinely from `ObjectDetectorResult`, not derived/estimated (unlike Face/Hand/Pose, which carry no per-detection score at all). */
export function drawObjectDetections(
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  width: number,
  height: number,
  colors: TrackingColors,
): void {
  if (frame.objects.length === 0) return;
  ctx.lineWidth = 2;
  ctx.font = LABEL_FONT;

  for (const object of frame.objects) {
    const x = object.boundingBox.x * width;
    const y = object.boundingBox.y * height;
    const w = object.boundingBox.width * width;
    const h = object.boundingBox.height * height;

    ctx.strokeStyle = colors.objectDetection.line;
    ctx.strokeRect(x, y, w, h);

    const label = `${object.categoryName} ${Math.round(object.score * 100)}%`;
    const labelWidth = ctx.measureText(label).width + 6;
    ctx.fillStyle = colors.objectDetection.point;
    ctx.fillRect(x, y - 14 < 0 ? y : y - 14, labelWidth, 14);
    ctx.fillStyle = "white";
    ctx.fillText(label, x + 3, (y - 14 < 0 ? y : y - 14) + 10);
  }
}

/**
 * The one place that dispatches "which render mode draws what" — shared by
 * the live on-screen `TrackingCanvas` and the recording composite canvas
 * (`use-recording-canvas.ts`) so a recorded video's overlay always matches
 * exactly what was on screen, instead of two separately-maintained copies
 * of this switch statement drifting apart.
 */
export function drawTrackingOverlay(
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  renderMode: RenderMode,
  width: number,
  height: number,
  colors: TrackingColors,
): void {
  if (renderMode === "camera-only") return;

  // Independent of the face/hand/pose render-mode switch below — drawn
  // whenever their respective model is on, regardless of which of
  // skeleton/wireframe/etc is selected for face/hand/pose.
  drawSegmentationMask(ctx, frame, width, height, colors);
  drawObjectDetections(ctx, frame, width, height, colors);

  switch (renderMode) {
    case "wireframe":
      drawWireframe(ctx, frame, width, height, colors);
      break;
    case "landmark-ids":
      drawLandmarkIds(ctx, frame, width, height, colors);
      break;
    case "bounding-box":
      drawBoundingBoxes(ctx, frame, width, height, colors);
      break;
    case "confidence":
      drawConfidenceOverlay(ctx, frame, width, height, colors);
      break;
    case "skeleton":
    default:
      if (frame.face) drawFace(ctx, frame.face, width, height, colors);
      if (frame.hands.length > 0) drawHand(ctx, frame.hands, width, height, colors);
      if (frame.pose) drawPose(ctx, frame.pose, width, height, colors);
      break;
  }
}
