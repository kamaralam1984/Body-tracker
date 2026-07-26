"use client";

/**
 * Real browser Picture-in-Picture — `videoRef.current.requestPictureInPicture()`.
 * `isSupported` starts `false` on both server and client (matches the same
 * hydration-safe pattern `FullscreenButton` uses) then flips true on mount
 * if the browser actually supports it.
 */

import { useCallback, useEffect, useState, type RefObject } from "react";

export interface UsePictureInPictureResult {
  isSupported: boolean;
  isActive: boolean;
  toggle: () => Promise<void>;
}

export function usePictureInPicture(
  videoRef: RefObject<HTMLVideoElement | null>,
): UsePictureInPictureResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(typeof document !== "undefined" && document.pictureInPictureEnabled === true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsActive(true);
    const onLeave = () => setIsActive(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [videoRef]);

  const toggle = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // Video not ready, permission blocked, or genuinely unsupported — no-op.
    }
  }, [videoRef]);

  return { isSupported, isActive, toggle };
}
