/**
 * Full-area loading state that mirrors `CameraCard`'s dark frame treatment
 * (`aspect-video rounded-2xl border border-border bg-neutral-950`) so it can
 * stand in for the real card before it mounts, with zero visual pop when
 * swapped out. Implies "actively connecting to a camera" — for the
 * pre-hook-state page shimmer, use `CameraSkeleton` instead.
 */

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function CameraLoadingScreen({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border relative flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border bg-neutral-950 shadow-lg",
        className,
      )}
    >
      <Spinner size="lg" className="text-neutral-300" />
      <p className="text-sm font-medium text-neutral-50">
        Loading camera<span className="text-neutral-300">…</span>
      </p>
    </div>
  );
}
