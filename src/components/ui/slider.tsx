"use client";

/**
 * Range slider — the design system's first shared `Slider` primitive
 * (previously each feature that needed one, e.g. `camera-settings-drawer.tsx`,
 * built a local one-off; this promotes that same visual technique — native
 * `<input type="range">` with custom thumb/track styling — into a reusable
 * component with a value readout and optional unit suffix).
 *
 * <Slider label="Smoothing" value={50} onChange={setSmoothing} />
 * <Slider label="Detection distance" value={70} min={0} max={100} unit="%" />
 */

import { cn } from "@/lib/utils";

export interface SliderProps {
  label?: string;
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  disabled,
  className,
  id,
  ...props
}: SliderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-foreground text-sm font-medium">
            {label}
          </label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {value}
            {unit}
          </span>
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(Number(event.target.value))}
        aria-label={label ?? props["aria-label"]}
        className={cn(
          "bg-muted accent-accent h-1.5 w-full appearance-none rounded-full disabled:opacity-50",
          "[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm",
          "[&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
        )}
      />
    </div>
  );
}
