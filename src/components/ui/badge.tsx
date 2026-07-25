import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        accent: "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200",
        success: "bg-success-bg text-success-600 dark:text-success-500",
        warning: "bg-warning-bg text-warning-600 dark:text-warning-500",
        danger: "bg-danger-bg text-danger-600 dark:text-danger-500",
        info: "bg-info-bg text-info-600 dark:text-info-500",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
