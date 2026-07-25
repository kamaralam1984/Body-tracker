"use client";

import * as React from "react";
import {
  DayPicker,
  UI,
  SelectionState,
  type DayButtonProps,
  type ChevronProps,
} from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `react-day-picker` v10 ships no default CSS (the base stylesheet is an
 * opt-in subpath export at `react-day-picker/style.css`). Per this project's
 * zero-external-CSS convention we skip it entirely and style the calendar
 * purely through the `classNames` prop (for structural elements) and the
 * `components` override prop (for the chevrons and the day button, whose
 * selection/range/today/disabled/outside states are only exposed via the
 * `modifiers` argument passed to a custom `DayButton` component — not via
 * data attributes on the day cell — so per-state Tailwind classes are
 * computed in JS with `cn()` rather than relying on CSS cascade order).
 */

function CalendarChevron({ className, orientation, ...props }: ChevronProps) {
  const Icon = orientation === "right" ? ChevronRight : ChevronLeft;
  return <Icon className={cn("size-4", className)} strokeWidth={1.75} {...props} />;
}

function CalendarDayButton({ className, day, modifiers, ...props }: DayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex size-9 items-center justify-center rounded-md text-sm font-normal transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        (modifiers.outside || modifiers.disabled) && "text-muted-foreground/40",
        modifiers.today &&
          !modifiers.selected &&
          "border-accent/40 text-foreground border font-semibold",
        modifiers.range_start && "rounded-r-none",
        modifiers.range_end && "rounded-l-none",
        modifiers.range_middle && "text-foreground rounded-none hover:bg-transparent",
        modifiers.selected &&
          !modifiers.range_middle &&
          "bg-accent text-accent-foreground hover:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

/** Themed wrapper around `react-day-picker`'s `DayPicker`, styled entirely with Tailwind. */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("text-sm", className)}
      classNames={{
        [UI.Months]: "relative flex flex-col gap-4 sm:flex-row",
        [UI.Month]: "space-y-3",
        [UI.MonthCaption]: "flex h-9 items-center justify-center",
        [UI.CaptionLabel]: "text-sm font-medium text-foreground",
        [UI.Nav]: "absolute inset-x-0 top-0 flex items-center justify-between",
        [UI.PreviousMonthButton]:
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        [UI.NextMonthButton]:
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        [UI.MonthGrid]: "w-full border-collapse",
        [UI.Weekday]: "pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        [UI.Day]: "p-0 text-center align-middle",
        [SelectionState.range_middle]: "bg-accent-100 dark:bg-accent-900",
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}
