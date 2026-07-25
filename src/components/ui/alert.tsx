import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, Info, TriangleAlert, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-lg border p-4 text-sm [&_svg]:size-5", {
  variants: {
    variant: {
      neutral: "border-border bg-surface text-foreground [&_svg]:text-muted-foreground",
      success: "border-success-bg bg-success-bg text-success-600 [&_svg]:text-success-500",
      warning: "border-warning-bg bg-warning-bg text-warning-600 [&_svg]:text-warning-500",
      danger: "border-danger-bg bg-danger-bg text-danger-600 [&_svg]:text-danger-500",
      info: "border-info-bg bg-info-bg text-info-600 [&_svg]:text-info-500",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

const icons = {
  neutral: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: CircleX,
  info: Info,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  icon?: boolean;
}

export function Alert({
  className,
  variant = "neutral",
  title,
  icon = true,
  children,
  ...props
}: AlertProps) {
  const Icon = icons[variant ?? "neutral"];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon && <Icon className="mt-0.5 shrink-0" strokeWidth={2} />}
      <div className="flex flex-col gap-0.5">
        {title && <p className="text-foreground font-medium">{title}</p>}
        {children && (
          <div className="text-muted-foreground [&:first-child]:text-inherit">{children}</div>
        )}
      </div>
    </div>
  );
}
