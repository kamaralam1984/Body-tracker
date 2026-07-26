"use client";

/**
 * The main pill-shaped control bar — a premium video-call toolbar (Google
 * Meet style): a row of circular icon buttons on a frosted, elevated pill,
 * driven entirely by `useCameraContext()`. Also owns the toolbar's keyboard
 * shortcuts (Space / M / S — see the effect below for the exact mapping and
 * why).
 *
 * <CameraToolbar onScreenshot={(dataUrl) => setLastShot(dataUrl)} />
 */

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera as CameraIcon, Pause, Play, RefreshCw, Video, VideoOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { MirrorToggle } from "./mirror-toggle";
import { CameraFlipButton } from "./camera-flip-button";
import type { GridOverlayMode } from "../types";

const GRID_CYCLE_ORDER: GridOverlayMode[] = [
  "off",
  "thirds",
  "crosshair",
  "golden",
  "safe-margins",
];

interface CameraToolbarProps {
  onScreenshot?: (dataUrl: string) => void;
  className?: string;
}

interface ToolbarButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: Extract<ButtonProps["variant"], "primary" | "danger"> | "neutral";
  spin?: boolean;
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "neutral",
  spin,
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
          "size-11 rounded-full sm:size-12",
          variant === "neutral" && "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        <Icon className={cn("size-4", spin && "animate-spin")} strokeWidth={1.75} />
      </Button>
    </Tooltip>
  );
}

export function CameraToolbar({ onScreenshot, className }: CameraToolbarProps) {
  const {
    status,
    isSupported,
    start,
    stop,
    pause,
    resume,
    refresh,
    toggleMirror,
    takeScreenshot,
    devices,
    flipFacing,
    settings,
    setGridOverlay,
  } = useCameraContext();

  const isRunningLike = status === "running" || status === "paused" || status === "ready";
  const isStarting = status === "initializing" || status === "waiting" || status === "reconnecting";
  const canPause = status === "running" || status === "paused";
  const canScreenshot = status === "running" || status === "paused";
  const isRefreshBusy = status === "initializing" || status === "reconnecting";

  const handleStartStop = useCallback(() => {
    if (isRunningLike) stop();
    else void start();
  }, [isRunningLike, start, stop]);

  const handlePauseResume = useCallback(() => {
    if (status === "paused") resume();
    else if (status === "running") pause();
  }, [status, pause, resume]);

  const handleScreenshot = useCallback(() => {
    const dataUrl = takeScreenshot();
    if (dataUrl) onScreenshot?.(dataUrl);
  }, [takeScreenshot, onScreenshot]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  // Keyboard shortcuts, scoped for as long as the toolbar is mounted:
  //   Space — the universal "play/pause" media key. Before the camera has
  //     ever started there's nothing to pause, so Space starts it; once
  //     it's live, Space toggles pause/resume rather than ending the call
  //     outright. Ending stays behind its own dedicated button so a single
  //     stray keypress can't hang up the camera.
  //   M — toggle mirror mode.
  //   S — take a screenshot (only while there's a live frame to capture).
  //   C — flip front/back camera (only meaningful with 2+ video inputs).
  //   G — cycle the grid overlay mode.
  // Ignored while focus is inside a text input/textarea/contenteditable so
  // typing "space" or "s" elsewhere on the page doesn't trigger controls.
  useEffect(() => {
    function isTypingTarget(el: Element | null): boolean {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isSupported || isTypingTarget(document.activeElement)) return;

      switch (event.code) {
        case "Space":
          event.preventDefault();
          if (isRunningLike) handlePauseResume();
          else if (!isStarting) void start();
          break;
        case "KeyM":
          toggleMirror();
          break;
        case "KeyS":
          if (canScreenshot) handleScreenshot();
          break;
        case "KeyC":
          if (devices.length > 1 && isRunningLike) void flipFacing();
          break;
        case "KeyG": {
          const currentIndex = GRID_CYCLE_ORDER.indexOf(settings.gridOverlay);
          const next = GRID_CYCLE_ORDER[(currentIndex + 1) % GRID_CYCLE_ORDER.length]!;
          setGridOverlay(next);
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isSupported,
    isRunningLike,
    isStarting,
    canScreenshot,
    start,
    handlePauseResume,
    handleScreenshot,
    toggleMirror,
    devices.length,
    flipFacing,
    settings.gridOverlay,
    setGridOverlay,
  ]);

  return (
    <motion.div
      role="toolbar"
      aria-label="Camera controls"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "border-border bg-surface-elevated/95 flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur-md",
        className,
      )}
    >
      <ToolbarButton
        label={isRunningLike ? "End camera (Space)" : "Start camera (Space)"}
        icon={isRunningLike ? VideoOff : Video}
        onClick={handleStartStop}
        disabled={!isSupported || isStarting}
        variant={isRunningLike ? "danger" : "primary"}
      />
      <ToolbarButton
        label={status === "paused" ? "Resume (Space)" : "Pause (Space)"}
        icon={status === "paused" ? Play : Pause}
        onClick={handlePauseResume}
        disabled={!isSupported || !canPause}
      />
      <MirrorToggle />
      <CameraFlipButton />
      <ToolbarButton
        label="Take screenshot (S)"
        icon={CameraIcon}
        onClick={handleScreenshot}
        disabled={!isSupported || !canScreenshot}
      />
      <ToolbarButton
        label="Refresh camera"
        icon={RefreshCw}
        onClick={handleRefresh}
        disabled={!isSupported || isRefreshBusy}
        spin={isRefreshBusy}
      />
    </motion.div>
  );
}
