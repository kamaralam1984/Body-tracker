"use client";

/**
 * Standalone fullscreen toggle for an arbitrary target element (typically the
 * `CameraCard` root, via a ref passed down from the page). Uses the native
 * Fullscreen API directly rather than any camera state — it has no opinion
 * about `useCameraContext()`.
 *
 * <FullscreenButton targetRef={cardRef} />
 */

import { useCallback, useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FullscreenButtonProps {
  targetRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

export function FullscreenButton({ targetRef, className }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Starts false on both server and client to avoid a hydration mismatch,
  // then flips true on mount if the browser actually supports the API.
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Runs once on mount only, to report actual browser support without
    // risking a server/client hydration mismatch (see the initial value above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAvailable(typeof document !== "undefined" && document.fullscreenEnabled !== false);

    const handleChange = () => setIsFullscreen(document.fullscreenElement === targetRef.current);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [targetRef]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void targetRef.current?.requestFullscreen();
    }
  }, [targetRef]);

  // Fullscreen API unsupported (e.g. some iOS browsers): render nothing
  // rather than a permanently-disabled button, since there's no path to
  // ever enable it for the user.
  if (!isAvailable) return null;

  const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";

  return (
    <Tooltip content={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={isFullscreen}
        aria-label={label}
        onClick={toggleFullscreen}
        className={cn(
          "bg-muted text-muted-foreground hover:bg-muted/80 size-11 rounded-full sm:size-12",
          className,
        )}
      >
        {isFullscreen ? (
          <Minimize className="size-4" strokeWidth={1.75} />
        ) : (
          <Maximize className="size-4" strokeWidth={1.75} />
        )}
      </Button>
    </Tooltip>
  );
}
