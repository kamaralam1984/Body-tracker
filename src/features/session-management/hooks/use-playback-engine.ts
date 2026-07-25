"use client";

/**
 * Simulates replay over a session's recorded duration. There is no actual
 * video/frame data to play back (this app never records footage — only live
 * preview + tracking) — this operates purely as a time-position engine
 * (like an audio scrubber) that `SessionPlayer` renders a placeholder
 * preview and timeline markers against. Being honest about that scope is
 * the point: it's a real, correct playback *engine*, just with no footage
 * underneath it yet.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface UsePlaybackEngineOptions {
  durationSeconds: number;
}

export interface UsePlaybackEngineResult {
  currentTime: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  progress: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  seekToFraction: (fraction: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  skip: (deltaSeconds: number) => void;
  stepFrame: (direction: 1 | -1) => void;
  reset: () => void;
}

export function usePlaybackEngine({
  durationSeconds,
}: UsePlaybackEngineOptions): UsePlaybackEngineResult {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || durationSeconds <= 0) {
      lastTsRef.current = null;
      return;
    }

    function tick(ts: number) {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const deltaSeconds = ((ts - lastTsRef.current) / 1000) * speed;
      lastTsRef.current = ts;
      setCurrentTime((prev) => {
        const next = prev + deltaSeconds;
        if (next >= durationSeconds) {
          setIsPlaying(false);
          return durationSeconds;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, durationSeconds]);

  const seek = useCallback(
    (seconds: number) => {
      setCurrentTime(Math.min(Math.max(seconds, 0), Math.max(durationSeconds, 0)));
    },
    [durationSeconds],
  );

  const play = useCallback(() => {
    if (durationSeconds <= 0) return;
    setCurrentTime((prev) => (prev >= durationSeconds ? 0 : prev));
    setIsPlaying(true);
  }, [durationSeconds]);

  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((prev) => !prev), []);
  const seekToFraction = useCallback(
    (fraction: number) => seek(fraction * durationSeconds),
    [seek, durationSeconds],
  );
  const skip = useCallback(
    (deltaSeconds: number) => seek(currentTime + deltaSeconds),
    [seek, currentTime],
  );
  const stepFrame = useCallback(
    (direction: 1 | -1) => seek(currentTime + direction),
    [seek, currentTime],
  );
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const progress = durationSeconds > 0 ? Math.min(currentTime / durationSeconds, 1) : 0;

  return {
    currentTime,
    isPlaying,
    speed,
    progress,
    play,
    pause,
    toggle,
    seek,
    seekToFraction,
    setSpeed,
    skip,
    stepFrame,
    reset,
  };
}
