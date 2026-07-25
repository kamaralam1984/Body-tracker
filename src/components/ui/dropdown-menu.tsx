"use client";

import { createContext, useContext, useState, type ReactElement } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Popover } from "./popover";
import type { Placement } from "@/lib/floating";
import { cn } from "@/lib/utils";

const DropdownMenuCloseContext = createContext<() => void>(() => {});

interface DropdownMenuProps {
  trigger: ReactElement;
  children: React.ReactNode;
  placement?: Placement;
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  placement = "bottom-start",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      trigger={trigger}
      placement={placement}
      open={open}
      onOpenChange={setOpen}
      className={className}
    >
      <DropdownMenuCloseContext.Provider value={() => setOpen(false)}>
        <div role="menu">{children}</div>
      </DropdownMenuCloseContext.Provider>
    </Popover>
  );
}

export function DropdownMenuItem({
  icon: Icon,
  destructive,
  className,
  href,
  onSelect,
  children,
  ...props
}: {
  icon?: LucideIcon;
  destructive?: boolean;
  className?: string;
  href?: string;
  onSelect?: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const close = useContext(DropdownMenuCloseContext);

  const itemClassName = cn(
    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors duration-100",
    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
    destructive && "text-danger hover:bg-danger-bg focus-visible:bg-danger-bg",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        role="menuitem"
        onClick={() => {
          onSelect?.();
          close();
        }}
        className={itemClassName}
      >
        {Icon && <Icon className="size-4 shrink-0" strokeWidth={1.75} />}
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSelect?.();
        close();
      }}
      className={itemClassName}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" strokeWidth={1.75} />}
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="bg-border my-1.5 h-px" />;
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground px-2.5 py-1.5 text-xs font-medium tracking-wide uppercase">
      {children}
    </div>
  );
}
