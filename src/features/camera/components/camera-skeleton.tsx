/**
 * Pure-skeleton (pulsing block) placeholder shaped like the eventual camera
 * layout: a preview-sized block plus a row of toolbar-sized circles. Use
 * this for the initial page-load shimmer, before any camera hook state
 * exists at all — distinct from `CameraLoadingScreen`, whose spinner implies
 * "actively connecting to a camera" rather than "app JS still loading."
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TOOLBAR_BUTTON_COUNT = 5;

export function CameraSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: TOOLBAR_BUTTON_COUNT }).map((_, index) => (
          <Skeleton key={index} className="size-11 rounded-full" />
        ))}
      </div>
    </div>
  );
}
