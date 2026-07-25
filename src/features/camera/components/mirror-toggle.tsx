"use client";

/**
 * Standalone mirror toggle — an icon-button analog of `Switch`'s on/off
 * visual language (accent when active, muted when inactive) rather than a
 * literal track-and-thumb switch, since this control lives among circular
 * icon buttons (the toolbar) as often as it might live in a settings panel.
 *
 * <MirrorToggle />
 */

import { FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCameraContext } from "../context/camera-provider";

interface MirrorToggleProps {
  className?: string;
}

export function MirrorToggle({ className }: MirrorToggleProps) {
  const { settings, toggleMirror, isSupported } = useCameraContext();
  const active = settings.mirrored;
  const label = active ? "Turn off mirror mode" : "Turn on mirror mode";

  return (
    <Tooltip content={active ? "Mirroring on (M)" : "Mirroring off (M)"}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!isSupported}
        aria-pressed={active}
        aria-label={label}
        onClick={toggleMirror}
        className={cn(
          "size-11 rounded-full transition-colors duration-150 sm:size-12",
          active
            ? "bg-accent text-accent-foreground hover:bg-accent-600"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          className,
        )}
      >
        <FlipHorizontal className="size-4" strokeWidth={1.75} />
      </Button>
    </Tooltip>
  );
}
