"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { primaryNav, secondaryNav } from "@/constants/nav-items";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <Drawer open={open} onClose={onClose} side="left" className="max-w-72" title={siteConfig.name}>
      <nav className="flex flex-col gap-6">
        {primaryNav.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.title && (
              <p className="text-muted-foreground/70 px-2.5 pb-1 text-xs font-medium tracking-wide uppercase">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-[18px]" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-border-subtle mt-6 flex flex-col gap-3 border-t pt-4">
        {secondaryNav
          .flatMap((s) => s.items)
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-[18px]" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        <div className="flex items-center justify-between px-2.5">
          <span className="text-muted-foreground text-sm">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </Drawer>
  );
}
