"use client";

/**
 * Switches which overlay visualization `TrackingCanvas` draws — see
 * `render-modes.ts` for what each mode actually renders.
 *
 * <RenderModeSelector />
 */

import { Select, type SelectOption } from "@/components/ui/select";
import { useTrackingContext } from "../context/tracking-provider";
import type { RenderMode } from "../lib/render/render-modes";

const OPTIONS: SelectOption[] = [
  { value: "skeleton", label: "Skeleton overlay" },
  { value: "camera-only", label: "Camera only" },
  { value: "wireframe", label: "Wireframe" },
  { value: "landmark-ids", label: "Landmark IDs" },
  { value: "bounding-box", label: "Bounding boxes" },
  { value: "confidence", label: "Confidence overlay" },
];

export function RenderModeSelector({ className }: { className?: string }) {
  const { renderMode, setRenderMode } = useTrackingContext();

  return (
    <Select
      options={OPTIONS}
      value={renderMode}
      onValueChange={(value) => setRenderMode(value as RenderMode)}
      className={className}
    />
  );
}
