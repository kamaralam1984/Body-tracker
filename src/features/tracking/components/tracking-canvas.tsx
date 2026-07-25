"use client";

/**
 * The actual drawing surface. Reads `frameRef.current` (a plain ref updated
 * up to 30-60x/sec by the detection loop, see `use-body-tracking.ts`) inside
 * its own `requestAnimationFrame` loop rather than via props/state, so
 * rendering keeps pace with detection without forcing React re-renders.
 */

import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import { drawFace } from "../lib/render/draw-face";
import { drawHand } from "../lib/render/draw-hand";
import { drawPose } from "../lib/render/draw-pose";
import { resolveTrackingColors, type TrackingColors } from "../lib/render/resolve-tracking-colors";

interface TrackingCanvasProps {
  containerRef: RefObject<HTMLElement | null>;
  className?: string;
}

// Re-resolve CSS custom properties roughly once a second at 60fps rather
// than every frame — `getComputedStyle` is a real cost, and these design
// tokens only ever change on a theme toggle.
const COLOR_REFRESH_INTERVAL_FRAMES = 60;

export function TrackingCanvas({ containerRef, className }: TrackingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { frameRef, config } = useTrackingContext();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cssWidth = 0;
    let cssHeight = 0;

    function applySize(width: number, height: number) {
      cssWidth = width;
      cssHeight = height;
      const dpr = window.devicePixelRatio || 1;
      // Backing store scaled to devicePixelRatio for crisp lines on high-DPI
      // screens; CSS size stays matched to the container's actual box.
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const initialRect = container.getBoundingClientRect();
    applySize(initialRect.width, initialRect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(container);

    let colors: TrackingColors = resolveTrackingColors();
    let frameCount = 0;
    let rafHandle = 0;

    function draw() {
      frameCount += 1;
      if (frameCount % COLOR_REFRESH_INTERVAL_FRAMES === 0) {
        colors = resolveTrackingColors();
      }

      ctx!.clearRect(0, 0, cssWidth, cssHeight);

      const frame = frameRef.current;
      if (frame && cssWidth > 0 && cssHeight > 0) {
        if (frame.face) drawFace(ctx!, frame.face, cssWidth, cssHeight, colors);
        if (frame.hands.length > 0) drawHand(ctx!, frame.hands, cssWidth, cssHeight, colors);
        if (frame.pose) drawPose(ctx!, frame.pose, cssWidth, cssHeight, colors);
      }

      rafHandle = requestAnimationFrame(draw);
    }
    rafHandle = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafHandle);
    };
    // containerRef/frameRef are stable ref objects for the lifetime of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none block", config.mirrored && "-scale-x-100", className)}
    />
  );
}
