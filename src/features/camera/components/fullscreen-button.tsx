"use client";

/**
 * Fullscreen toggle button — purely presentational, driven by
 * `use-fullscreen.ts` (owned by the page, since `CameraTopBar` and the page
 * itself both need to agree on the same `isFullscreen` value). Always
 * renders: the CSS-only fallback in the hook means there's no browser where
 * this control has nothing to do.
 *
 * <FullscreenButton isFullscreen={isFullscreen} onToggle={toggle} />
 */

import { useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
  className?: string;
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function FullscreenButton({ isFullscreen, onToggle, className }: FullscreenButtonProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return;
      if (event.code === "KeyF") onToggle();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle]);

  const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";

  return (
    <Tooltip content={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={isFullscreen}
        aria-label={label}
        onClick={onToggle}
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
