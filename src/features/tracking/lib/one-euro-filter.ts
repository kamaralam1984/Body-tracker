/**
 * One Euro Filter (Casiez, Roussel, Vogel — CHI 2012). The standard choice
 * for smoothing noisy, low-latency signals like tracked landmarks: it
 * suppresses jitter when a point is nearly still and relaxes smoothing when
 * it moves quickly, so motion stays responsive instead of trailing behind.
 */

function smoothingFactor(deltaSeconds: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * deltaSeconds;
  return r / (r + 1);
}

function lerp(a: number, x: number, xPrev: number): number {
  return a * x + (1 - a) * xPrev;
}

export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(
    private minCutoff = 1.0,
    private beta = 0.3,
    private dCutoff = 1.0,
  ) {}

  setParams(minCutoff: number, beta: number, dCutoff = this.dCutoff) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  /** @param tMs current time in milliseconds. @param x the raw sample. */
  filter(tMs: number, x: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = tMs;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }

    const deltaSeconds = Math.max((tMs - this.tPrev) / 1000, 1e-3);
    const derivativeAlpha = smoothingFactor(deltaSeconds, this.dCutoff);
    const derivative = (x - this.xPrev) / deltaSeconds;
    const smoothedDerivative = lerp(derivativeAlpha, derivative, this.dxPrev);

    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);
    const alpha = smoothingFactor(deltaSeconds, cutoff);
    const smoothedValue = lerp(alpha, x, this.xPrev);

    this.tPrev = tMs;
    this.xPrev = smoothedValue;
    this.dxPrev = smoothedDerivative;
    return smoothedValue;
  }

  reset() {
    this.xPrev = null;
    this.tPrev = null;
    this.dxPrev = 0;
  }
}

interface PointFilters {
  x: OneEuroFilter;
  y: OneEuroFilter;
  z: OneEuroFilter;
}

export interface SmoothablePoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Smooths a set of independent point streams (e.g. every face/hand/pose
 * landmark) keyed by a stable id. Call `endFrame()` once per detection pass
 * after smoothing every point that was actually seen, so filters for
 * subjects that left the frame get dropped — otherwise a landmark
 * reappearing at a new position would visibly glide back in from its last
 * remembered spot instead of snapping to the new, correct one.
 */
export class LandmarkSmoother {
  private filters = new Map<string, PointFilters>();
  private seenThisFrame = new Set<string>();
  private minCutoff: number;
  private beta: number;

  /** @param smoothing 0 (minimal smoothing, most responsive) – 1 (maximum smoothing). */
  constructor(smoothing = 0.5) {
    const clamped = Math.min(Math.max(smoothing, 0), 1);
    // minCutoff lower = more smoothing at rest; beta lower = less speed-adaptive responsiveness.
    this.minCutoff = 1.4 - clamped * 1.2;
    this.beta = 0.4 - clamped * 0.35;
  }

  setSmoothing(smoothing: number) {
    const clamped = Math.min(Math.max(smoothing, 0), 1);
    this.minCutoff = 1.4 - clamped * 1.2;
    this.beta = 0.4 - clamped * 0.35;
    for (const filters of this.filters.values()) {
      filters.x.setParams(this.minCutoff, this.beta);
      filters.y.setParams(this.minCutoff, this.beta);
      filters.z.setParams(this.minCutoff, this.beta);
    }
  }

  smoothPoint<T extends SmoothablePoint>(key: string, tMs: number, point: T): T {
    this.seenThisFrame.add(key);
    let filters = this.filters.get(key);
    if (!filters) {
      filters = {
        x: new OneEuroFilter(this.minCutoff, this.beta),
        y: new OneEuroFilter(this.minCutoff, this.beta),
        z: new OneEuroFilter(this.minCutoff, this.beta),
      };
      this.filters.set(key, filters);
    }
    return {
      ...point,
      x: filters.x.filter(tMs, point.x),
      y: filters.y.filter(tMs, point.y),
      z: point.z !== undefined ? filters.z.filter(tMs, point.z) : point.z,
    };
  }

  smoothPoints<T extends SmoothablePoint>(keyPrefix: string, tMs: number, points: T[]): T[] {
    return points.map((point, index) => this.smoothPoint(`${keyPrefix}:${index}`, tMs, point));
  }

  endFrame() {
    for (const key of this.filters.keys()) {
      if (!this.seenThisFrame.has(key)) this.filters.delete(key);
    }
    this.seenThisFrame.clear();
  }

  reset() {
    this.filters.clear();
    this.seenThisFrame.clear();
  }
}
