"use client";

import { Menu } from "lucide-react";
import { CommandSearch } from "./command-search";
import { NotificationsMenu } from "./notifications-menu";
import { ProfileMenu } from "./profile-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenMobileNav: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ onOpenMobileNav, children, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "border-border bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-md transition-colors lg:hidden"
      >
        <Menu className="size-[18px]" strokeWidth={1.75} />
      </button>

      <div className="flex flex-1 items-center">{children}</div>

      <div className="hidden sm:block">
        <CommandSearch />
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle className="hidden sm:inline-flex" />
        <NotificationsMenu />
        <div className="bg-border mx-1 h-5 w-px" />
        <ProfileMenu />
      </div>
    </header>
  );
}
