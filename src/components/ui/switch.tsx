"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className, id, ...props }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "ease-standard relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200",
          "focus-visible:ring-ring/40 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          checked ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-700",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        {...props}
      >
        <motion.span
          animate={{ x: checked ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="pointer-events-none block size-3.5 rounded-full bg-white shadow-sm"
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";
