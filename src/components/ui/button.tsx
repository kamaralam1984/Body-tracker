"use client";

import { cloneElement, forwardRef, isValidElement } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 ease-standard disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-neutral-800 dark:hover:bg-neutral-200",
        secondary: "bg-surface text-foreground border border-border shadow-xs hover:bg-muted",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        accent: "bg-accent text-accent-foreground shadow-xs hover:bg-accent-600",
        soft: "bg-accent-100 text-accent-700 hover:bg-accent-200 dark:bg-accent-900 dark:text-accent-200 dark:hover:bg-accent-800",
        success: "bg-success text-success-foreground shadow-xs hover:bg-success-600",
        warning:
          "bg-warning text-warning-foreground shadow-xs hover:bg-warning-600 dark:hover:brightness-110",
        danger: "bg-danger text-danger-foreground shadow-xs hover:bg-danger-600",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-9 px-4 [&_svg]:size-4",
        lg: "h-11 px-6 text-[15px] [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children">, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  children?: React.ReactNode;
  /** Render as the single child element (e.g. a `Link`) instead of a `<button>`. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, asChild, children, ...props }, ref) => {
    if (asChild && isValidElement(children)) {
      return cloneElement(
        children as React.ReactElement<{ className?: string }>,
        {
          ref,
          className: cn(
            buttonVariants({ variant, size }),
            className,
            (children as React.ReactElement<{ className?: string }>).props.className,
          ),
          ...props,
        } as Record<string, unknown>,
      );
    }

    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </motion.button>
    );
  },
);
Button.displayName = "Button";
