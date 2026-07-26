"use client";

/**
 * Slim status strip docked to the top of the video, dark chrome regardless
 * of site theme (matches Meet/Zoom/OBS convention: video-overlay controls
 * stay dark-on-video even in light mode, since they sit on camera footage,
 * not page background). Purely a readout + a few navigation buttons — no
 * new state of its own.
 *
 * Recording/AI-status/processing-time are passed in as props rather than
 * read from `useTrackingContext()` directly, since this is a camera-feature
 * component and the two features stay decoupled except at the page level
 * that already composes both.
 *
 * <CameraTopBar
 *   isRecording={recording.isRecording}
 *   aiStatusLabel="Tracking"
 *   processingTimeMs={perf.processingTimeMs}
 *   videoRef={videoRef}
 *   isFullscreen={isFullscreen}
 *   onToggleFullscreen={toggleFullscreen}
 *   onSettingsClick={() => setSettingsOpen(true)}
 * />
 */

import { HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";
import { CAMERA_KEYBOARD_SHORTCUTS } from "../lib/keyboard-shortcuts";
import { FullscreenButton } from "./fullscreen-button";
import { PictureInPictureButton } from "./picture-in-picture-button";

interface CameraTopBarProps {
  isRecording?: boolean;
  aiStatusLabel?: string;
  processingTimeMs?: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onSettingsClick: () => void;
  className?: string;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-1.5 whitespace-nowrap">{children}</span>;
}

export function CameraTopBar({
  isRecording,
  aiStatusLabel,
  processingTimeMs,
  videoRef,
  isFullscreen,
  onToggleFullscreen,
  onSettingsClick,
  className,
}: CameraTopBarProps) {
  const { status, stats, devices, settings } = useCameraContext();
  const isLive = status === "running" || status === "paused";
  const activeDevice = devices.find((d) => d.deviceId === settings.deviceId);
  const resolution = stats.width && stats.height ? `${stats.width}×${stats.height}` : null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3",
        "bg-gradient-to-b from-black/60 to-transparent px-3 py-2.5 text-xs text-white/90",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <Chip>
          <span className="truncate font-medium">{activeDevice?.label ?? "Camera"}</span>
        </Chip>
        {isLive && resolution && <Chip>{resolution}</Chip>}
        {isLive && <Chip>{stats.fps} fps</Chip>}
        {isRecording && (
          <Chip>
            <span aria-hidden="true" className="bg-danger size-2 animate-pulse rounded-full" />
            REC
          </Chip>
        )}
        {aiStatusLabel && <Chip>{aiStatusLabel}</Chip>}
        {typeof processingTimeMs === "number" && processingTimeMs > 0 && (
          <Chip>{Math.round(processingTimeMs)} ms</Chip>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Popover
          placement="bottom-end"
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Keyboard shortcuts"
              className="size-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white"
            >
              <HelpCircle className="size-4" strokeWidth={1.75} />
            </Button>
          }
        >
          <div className="flex flex-col gap-1 p-1.5">
            <p className="text-muted-foreground px-1.5 pb-1 text-xs font-semibold tracking-wide uppercase">
              Keyboard shortcuts
            </p>
            {CAMERA_KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between gap-4 px-1.5 py-1 text-sm"
              >
                <span className="text-muted-foreground">{shortcut.action}</span>
                <kbd className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[11px]">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </Popover>
        <Tooltip content="Camera settings">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Camera settings"
            onClick={onSettingsClick}
            className="size-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white"
          >
            <Settings className="size-4" strokeWidth={1.75} />
          </Button>
        </Tooltip>
        <PictureInPictureButton
          videoRef={videoRef}
          className="size-8 bg-transparent text-white/90 hover:bg-white/10 hover:text-white"
        />
        <FullscreenButton
          isFullscreen={isFullscreen}
          onToggle={onToggleFullscreen}
          className="size-8 bg-transparent text-white/90 hover:bg-white/10 hover:text-white"
        />
      </div>
    </div>
  );
}
