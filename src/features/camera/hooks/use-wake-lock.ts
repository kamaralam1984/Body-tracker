"use client";

/**
 * Keeps the screen awake while the camera is active — real, standard Wake
 * Lock API (`navigator.wakeLock.request('screen')`). The lock auto-releases
 * whenever the tab is hidden (a real browser privacy/battery behavior, not
 * a bug) — this re-acquires it on `visibilitychange` if `active` is still
 * true when the tab comes back.
 */

import { useEffect } from "react";

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Battery saver, unsupported context, or permission denial — best-effort only.
      }
    }

    void acquire();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinel) void acquire();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
      sentinel = null;
    };
  }, [active]);
}
