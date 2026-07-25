"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, disabled, ...props }, ref) => {
    return (
      <span className={cn("relative inline-flex size-4 shrink-0", className)}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer absolute inset-0 size-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
        <span
          className={cn(
            "border-border bg-surface flex size-4 items-center justify-center rounded-[5px] border transition-colors duration-150",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-focus-visible:ring-ring/40 peer-focus-visible:ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1",
            "peer-disabled:opacity-50",
          )}
        >
          <motion.span
            initial={false}
            animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <Check className="text-accent-foreground size-3" strokeWidth={3} />
          </motion.span>
        </span>
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";
