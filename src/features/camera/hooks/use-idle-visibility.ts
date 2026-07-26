"use client";

/**
 * Generic "show on activity, hide after idle" visibility state — the
 * Google-Meet-style floating control cluster pattern: visible on mount,
 * shows again on any mouse/touch activity within `containerRef`, hides
 * itself after `timeoutMs` of no activity.
 *
 * <FloatingControls className={cn(!visible && "opacity-0")} />
 */

import { useEffect, useRef, useState, type RefObject } from "react";

const DEFAULT_TIMEOUT_MS = 3000;

export function useIdleVisibility(
  containerRef: RefObject<HTMLElement | null>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): boolean {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function show() {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Reduced-motion users get a control cluster that just stays put —
      // the point of auto-hide is a visual flourish, not a required behavior.
      if (!prefersReducedMotion) {
        timerRef.current = setTimeout(() => setVisible(false), timeoutMs);
      }
    }

    show();
    el.addEventListener("mousemove", show);
    el.addEventListener("mouseenter", show);
    el.addEventListener("touchstart", show);
    el.addEventListener("focusin", show);

    return () => {
      el.removeEventListener("mousemove", show);
      el.removeEventListener("mouseenter", show);
      el.removeEventListener("touchstart", show);
      el.removeEventListener("focusin", show);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [containerRef, timeoutMs]);

  return visible;
}
