"use client";

/**
 * Replay toolbar — a pill-shaped control bar in the same visual language as
 * `@/features/camera/components/camera-toolbar.tsx` (frosted elevated pill,
 * circular icon buttons, Tooltip-wrapped labels) plus a click/drag-seekable
 * scrubber with timeline-event tick marks. Driven entirely by the
 * `usePlaybackEngine` instance `SessionPlayer` lifts up and passes in — this
 * component never creates its own engine, so the preview and the toolbar
 * always agree on the current time.
 *
 * <ReplayControls engine={engine} durationSeconds={session.durationSeconds} timelineEvents={events} containerRef={containerRef} />
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PLAYBACK_SPEEDS,
  type PlaybackSpeed,
  type UsePlaybackEngineResult,
} from "../hooks/use-playback-engine";
import { formatClockTime } from "../lib/session-format";
import type { SessionTimelineEvent } from "../types";

interface ReplayControlsProps {
  engine: UsePlaybackEngineResult;
  durationSeconds: number;
  timelineEvents: SessionTimelineEvent[];
  /** The fullscreen target (typically SessionPlayer's preview container). Omit to hide the fullscreen button. */
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

interface ToolbarButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: Extract<ButtonProps["variant"], "primary"> | "neutral";
  size?: "sm" | "md";
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "neutral",
  size = "md",
}: ToolbarButtonProps) {
  return (
    <Tooltip content={label}>
      <Button
        type="button"
        size="icon"
        variant={variant === "neutral" ? "ghost" : variant}
        disabled={disabled}
        aria-label={label}
        onClick={onClick}
        className={cn(
          "rounded-full",
          size === "md" ? "size-11 sm:size-12" : "size-8",
          variant === "neutral" && "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        <Icon className={size === "md" ? "size-4" : "size-3.5"} strokeWidth={1.75} />
      </Button>
    </Tooltip>
  );
}

function SpeedControl({
  speed,
  onChange,
}: {
  speed: PlaybackSpeed;
  onChange: (speed: PlaybackSpeed) => void;
}) {
  return (
    <ButtonGroup>
      {PLAYBACK_SPEEDS.map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={value === speed ? "primary" : "outline"}
          aria-pressed={value === speed}
          onClick={() => onChange(value)}
          className="min-w-11 px-2 text-xs"
        >
          {value}x
        </Button>
      ))}
    </ButtonGroup>
  );
}

/** Horizontal seek track: click-to-seek plus full pointer-drag scrubbing, with timeline-event tick marks overlaid. */
function Scrubber({
  engine,
  durationSeconds,
  timelineEvents,
}: {
  engine: UsePlaybackEngineResult;
  durationSeconds: number;
  timelineEvents: SessionTimelineEvent[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fractionFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      engine.seekToFraction(fractionFromPointer(event.clientX));
    },
    [engine, fractionFromPointer],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      engine.seekToFraction(fractionFromPointer(event.clientX));
    },
    [isDragging, engine, fractionFromPointer],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  }, []);

  const progressPercent = engine.progress * 100;

  return (
    <div className="flex w-full items-center gap-3">
      <span className="text-muted-foreground w-11 shrink-0 text-right text-xs tabular-nums">
        {formatClockTime(engine.currentTime)}
      </span>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={durationSeconds}
        aria-valuenow={engine.currentTime}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") engine.skip(-5);
          else if (event.key === "ArrowRight") engine.skip(5);
        }}
        className="group bg-muted relative h-1.5 w-full flex-1 cursor-pointer touch-none rounded-full"
      >
        <motion.div
          className="bg-accent absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${progressPercent}%` }}
          transition={{ duration: isDragging ? 0 : 0.1, ease: "linear" }}
        />
        <div
          className="bg-accent border-surface absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition-transform duration-150 group-hover:scale-110"
          style={{ left: `${progressPercent}%` }}
        />

        {timelineEvents.map((event) => {
          const eventFraction =
            durationSeconds > 0
              ? Math.min(Math.max(event.offsetSeconds / durationSeconds, 0), 1)
              : 0;
          return (
            <Tooltip key={event.id} content={event.label}>
              <span
                className="bg-foreground/35 absolute top-1/2 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${eventFraction * 100}%` }}
              />
            </Tooltip>
          );
        })}
      </div>

      <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
        {formatClockTime(durationSeconds)}
      </span>
    </div>
  );
}

export function ReplayControls({
  engine,
  durationSeconds,
  timelineEvents,
  containerRef,
  className,
}: ReplayControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef) return;
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === containerRef?.current);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [containerRef]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef?.current?.requestFullscreen();
    }
  }, [containerRef]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Scrubber engine={engine} durationSeconds={durationSeconds} timelineEvents={timelineEvents} />

      <motion.div
        role="toolbar"
        aria-label="Replay controls"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="border-border bg-surface-elevated/95 flex flex-wrap items-center justify-between gap-3 rounded-full border px-3 py-2 shadow-lg backdrop-blur-md sm:flex-nowrap"
      >
        <div className="flex items-center gap-1.5">
          <ToolbarButton label="Back 10s" icon={SkipBack} onClick={() => engine.skip(-10)} />
          {!engine.isPlaying && (
            <ToolbarButton
              label="Previous frame"
              icon={ChevronLeft}
              size="sm"
              onClick={() => engine.stepFrame(-1)}
            />
          )}
          <Tooltip content={engine.isPlaying ? "Pause" : "Play"}>
            <Button
              type="button"
              size="icon"
              variant="primary"
              aria-label={engine.isPlaying ? "Pause" : "Play"}
              onClick={engine.toggle}
              className="size-12 rounded-full sm:size-14"
            >
              {engine.isPlaying ? (
                <Pause className="size-5" strokeWidth={1.75} />
              ) : (
                <Play className="size-5" strokeWidth={1.75} />
              )}
            </Button>
          </Tooltip>
          {!engine.isPlaying && (
            <ToolbarButton
              label="Next frame"
              icon={ChevronRight}
              size="sm"
              onClick={() => engine.stepFrame(1)}
            />
          )}
          <ToolbarButton label="Forward 10s" icon={SkipForward} onClick={() => engine.skip(10)} />
        </div>

        <div className="flex items-center gap-1.5">
          <SpeedControl speed={engine.speed} onChange={engine.setSpeed} />
          {containerRef && (
            <ToolbarButton
              label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              icon={isFullscreen ? Minimize : Maximize}
              onClick={toggleFullscreen}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
