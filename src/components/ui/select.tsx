"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover } from "./popover";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="p-1"
      trigger={
        <button
          type="button"
          className={cn(
            "border-border bg-surface text-foreground flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-xs transition-colors duration-150",
            "focus-visible:ring-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:outline-none",
            className,
          )}
        >
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      }
    >
      <div role="listbox" className="flex flex-col gap-0.5">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onValueChange?.(option.value);
                setOpen(false);
              }}
              className={cn(
                "text-foreground flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-100",
                "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
              )}
            >
              {option.label}
              {isSelected && <Check className="text-accent size-4" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
