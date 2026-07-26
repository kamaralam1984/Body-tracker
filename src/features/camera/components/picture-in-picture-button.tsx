"use client";

/**
 * Real browser Picture-in-Picture toggle — `usePictureInPicture()` wraps
 * `video.requestPictureInPicture()`. Renders nothing if the browser doesn't
 * actually support it (Firefox desktop, some mobile browsers), rather than a
 * permanently-disabled dead button. Also owns the `P` keyboard shortcut,
 * same self-contained pattern as `FullscreenButton`'s `F`.
 *
 * <PictureInPictureButton videoRef={videoRef} />
 */

import { useEffect } from "react";
import { PictureInPicture2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePictureInPicture } from "../hooks/use-picture-in-picture";

interface PictureInPictureButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function PictureInPictureButton({ videoRef, className }: PictureInPictureButtonProps) {
  const { isSupported, isActive, toggle } = usePictureInPicture(videoRef);

  useEffect(() => {
    if (!isSupported) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return;
      if (event.code === "KeyP") void toggle();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSupported, toggle]);

  if (!isSupported) return null;

  const label = isActive ? "Exit picture-in-picture (P)" : "Picture-in-picture (P)";

  return (
    <Tooltip content={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={isActive}
        aria-label={label}
        onClick={() => void toggle()}
        className={cn(
          "bg-muted text-muted-foreground hover:bg-muted/80 size-11 rounded-full sm:size-12",
          className,
        )}
      >
        <PictureInPicture2 className="size-4" strokeWidth={1.75} />
      </Button>
    </Tooltip>
  );
}
