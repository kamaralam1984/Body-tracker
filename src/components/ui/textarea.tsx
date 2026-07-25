import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid}
        className={cn(
          "border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/40 focus-visible:border-ring aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30 flex min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
