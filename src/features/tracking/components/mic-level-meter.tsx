"use client";

/**
 * Real live microphone level meter — Web Audio `AnalyserNode` reading RMS
 * volume off the actual mic track, not a decorative animation.
 *
 * <MicLevelMeter track={recording.micTrack} />
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function MicLevelMeter({
  track,
  className,
}: {
  track: MediaStreamTrack | null;
  className?: string;
}) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!track || typeof AudioContext === "undefined") {
      // Resetting to 0 when the track disappears is a legitimate external-sync
      // exception, not a derived-state anti-pattern (matches fullscreen-button.tsx).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLevel(0);
      return;
    }

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafHandle = 0;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const value of data) {
        const normalized = (value - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setLevel(Math.min(rms * 4, 1)); // scaled up — raw RMS for normal speech is quite low
      rafHandle = requestAnimationFrame(tick);
    }
    rafHandle = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafHandle);
      source.disconnect();
      void audioCtx.close();
    };
  }, [track]);

  return (
    <div
      className={cn("bg-muted h-1.5 w-full overflow-hidden rounded-full", className)}
      role="meter"
      aria-label="Microphone level"
      aria-valuenow={Math.round(level * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="bg-success-600 h-full transition-[width] duration-75 ease-out"
        style={{ width: `${level * 100}%` }}
      />
    </div>
  );
}
