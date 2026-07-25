import type { TrackingPoint } from "../../types";

/**
 * MediaPipe's `z` is roughly in the same normalized-x scale, centered near
 * 0 at the tracked subject's hips/wrist root, negative toward the camera.
 * There's no calibrated real-world unit — this is a relative depth cue for
 * rendering, not a measurement. Values are clamped to a typical arm's-reach
 * range so one outlier landmark can't blow out the whole scale.
 */
const Z_NEAR = -0.6;
const Z_FAR = 0.6;

/** 1 when a point is at its closest expected z, 0 at its farthest. */
function depthOf(z: number | undefined): number {
  if (z === undefined) return 0.5;
  const clamped = Math.min(Math.max(z, Z_NEAR), Z_FAR);
  return 1 - (clamped - Z_NEAR) / (Z_FAR - Z_NEAR);
}

export interface DepthStyle {
  widthScale: number;
  alphaScale: number;
}

/** Closer landmarks render thicker and fuller-opacity; farther ones thinner and fainter. */
export function depthStyleOf(z: number | undefined): DepthStyle {
  const depth = depthOf(z);
  return {
    widthScale: 0.7 + depth * 0.8,
    alphaScale: 0.55 + depth * 0.45,
  };
}

export function segmentDepthStyle(a: TrackingPoint, b: TrackingPoint): DepthStyle {
  const z = a.z !== undefined && b.z !== undefined ? (a.z + b.z) / 2 : undefined;
  return depthStyleOf(z);
}
