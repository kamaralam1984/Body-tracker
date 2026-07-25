/**
 * Resolves the design system's CSS custom properties (see `src/app/globals.css`)
 * into ready-to-use Canvas2D color strings for each tracking domain.
 *
 * One restrained color per domain — face (accent/indigo), hands (info/blue),
 * pose (success/emerald) — never per-landmark. Lines are drawn thin and
 * semi-transparent; points a touch more opaque so joints read as soft dots,
 * not hard debug markers. `faceAccent` is a slightly brighter tint of the
 * face color, reserved for the iris contours, for a touch of life without
 * turning the face overlay into a mesh grid.
 *
 * `getComputedStyle` resolves the app's chained custom properties (e.g.
 * `--color-accent-400` -> `var(--accent-400)` -> `oklch(...)`) all the way
 * down to a literal `oklch(...)` string, and Canvas2D's `fillStyle` /
 * `strokeStyle` accept both raw `oklch(...)` and `color-mix(in oklch, ...)`
 * strings directly (verified by rendering both to an offscreen canvas and
 * reading back non-transparent, alpha-scaled pixel data — not assumed).
 *
 * This is comparatively expensive (a style recalc), so callers must cache
 * the result and only call this occasionally — e.g. once on mount and then
 * about once a second from inside the draw loop — never on every frame.
 */

export interface TrackingColorPair {
  /** Stroke color for connection segments — thin, soft, semi-transparent. */
  line: string;
  /** Fill color for joints/points — a touch more opaque than `line`. */
  point: string;
}

export interface TrackingColors {
  face: TrackingColorPair;
  /** Slightly brighter tint of `face`, reserved for iris contours. */
  faceAccent: TrackingColorPair;
  hand: TrackingColorPair;
  /** Fill color for emphasized fingertip points — a touch brighter/larger. */
  handTip: TrackingColorPair;
  pose: TrackingColorPair;
}

const LINE_ALPHA = 55;
const POINT_ALPHA = 85;
const TIP_ALPHA = 95;

function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function toPair(
  colorValue: string,
  lineAlpha = LINE_ALPHA,
  pointAlpha = POINT_ALPHA,
): TrackingColorPair {
  return {
    line: `color-mix(in oklch, ${colorValue} ${lineAlpha}%, transparent)`,
    point: `color-mix(in oklch, ${colorValue} ${pointAlpha}%, transparent)`,
  };
}

export function resolveTrackingColors(): TrackingColors {
  const accent = readCssVar("--color-accent", "oklch(0.585 0.118 258)");
  const accentBright = readCssVar("--color-accent-400", "oklch(0.700 0.088 258)");
  const info = readCssVar("--color-info", "oklch(0.60 0.11 235)");
  const success = readCssVar("--color-success", "oklch(0.60 0.11 152)");

  return {
    face: toPair(accent),
    faceAccent: toPair(accentBright, LINE_ALPHA + 10, TIP_ALPHA),
    hand: toPair(info),
    handTip: toPair(info, LINE_ALPHA, TIP_ALPHA),
    pose: toPair(success),
  };
}
