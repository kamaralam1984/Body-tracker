import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, startIcon, endIcon, ...props }, ref) => {
    if (startIcon || endIcon) {
      return (
        <div className="relative flex items-center">
          {startIcon && (
            <span className="text-muted-foreground pointer-events-none absolute left-3 flex [&_svg]:size-4">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            aria-invalid={invalid}
            className={cn(
              "border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/40 focus-visible:border-ring aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30 flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              startIcon && "pl-9",
              endIcon && "pr-9",
              className,
            )}
            {...props}
          />
          {endIcon && (
            <span className="text-muted-foreground pointer-events-none absolute right-3 flex [&_svg]:size-4">
              {endIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        aria-invalid={invalid}
        className={cn(
          "border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/40 focus-visible:border-ring aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30 flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
