"use client";

/**
 * Fullscreen for an arbitrary element, with a real fallback for browsers
 * that don't support it — iOS Safari never implements the standard
 * Fullscreen API for a `<div>` (only `<video>` gets a native fullscreen
 * player via `webkitEnterFullscreen`), so `document.fullscreenEnabled` is
 * simply `false` there. Previously that made the fullscreen button render
 * nothing at all on those devices — a real regression, not a documented
 * limitation, since the app already has a CSS-only "fill the viewport"
 * mode (`camera-view.tsx`'s `isFullscreen`-driven classes) that doesn't
 * actually need the native API to work. This hook picks whichever path the
 * browser supports and exposes one `toggle()` either way.
 */

import { useCallback, useEffect, useState, type RefObject } from "react";

export interface UseFullscreenResult {
  isFullscreen: boolean;
  toggle: () => void;
}

export function useFullscreen(targetRef: RefObject<HTMLElement | null>): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Runs once on mount only, to report actual browser support without a
    // server/client hydration mismatch (server and first client render both
    // start `false`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsNative(typeof document !== "undefined" && document.fullscreenEnabled === true);

    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [targetRef]);

  // The native API dispatches its own `fullscreenchange` on Escape, but the
  // CSS-only fallback has no such native hook — wire Escape manually so
  // both paths honor the same documented shortcut.
  useEffect(() => {
    if (isNative || !isFullscreen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNative, isFullscreen]);

  const toggle = useCallback(() => {
    if (isNative) {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void targetRef.current?.requestFullscreen();
      }
      return;
    }
    setIsFullscreen((prev) => !prev);
  }, [isNative, targetRef]);

  return { isFullscreen, toggle };
}
