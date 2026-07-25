export type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end" | "bottom" | "top";

interface ComputePositionOptions {
  placement?: Placement;
  offset?: number;
  padding?: number;
}

interface Position {
  top: number;
  left: number;
  placement: Placement;
}

/** Lightweight viewport-aware positioning for anchored overlays (no external deps). */
export function computePosition(
  trigger: DOMRect,
  content: DOMRect,
  { placement = "bottom-start", offset = 8, padding = 8 }: ComputePositionOptions = {},
): Position {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const wantsTop = placement.startsWith("top");
  const fitsBelow = trigger.bottom + offset + content.height <= viewportHeight - padding;
  const fitsAbove = trigger.top - offset - content.height >= padding;

  const resolvedTop = wantsTop
    ? fitsAbove || !fitsBelow
      ? "top"
      : "bottom"
    : fitsBelow || !fitsAbove
      ? "bottom"
      : "top";

  const top =
    resolvedTop === "bottom" ? trigger.bottom + offset : trigger.top - offset - content.height;

  let left: number;
  if (placement.endsWith("end")) {
    left = trigger.right - content.width;
  } else if (placement === "bottom" || placement === "top") {
    left = trigger.left + trigger.width / 2 - content.width / 2;
  } else {
    left = trigger.left;
  }

  left = Math.min(Math.max(left, padding), viewportWidth - content.width - padding);

  return {
    top,
    left,
    placement: `${resolvedTop}-${placement.endsWith("end") ? "end" : "start"}` as Placement,
  };
}
