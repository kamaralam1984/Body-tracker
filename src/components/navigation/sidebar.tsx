"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { primaryNav, secondaryNav } from "@/constants/nav-items";
import { siteConfig } from "@/config/site";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/types/nav";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

function NavLink({
  href,
  icon: Icon,
  label,
  collapsed,
  active,
}: {
  href: string;
  icon: NavSection["items"][number]["icon"];
  label: string;
  collapsed: boolean;
  active: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="bg-muted absolute inset-0 rounded-md"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className="relative z-10 size-[18px] shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="relative z-10 truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={label} placement="bottom-start">
        {link}
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar({ collapsed, onToggle, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn("border-border bg-surface-sunken flex h-full flex-col border-r", className)}
    >
      <div
        className={cn("flex h-14 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}
      >
        <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
          {siteConfig.shortName}
        </div>
        {!collapsed && (
          <span className="text-foreground truncate text-sm font-semibold">{siteConfig.name}</span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        {primaryNav.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.title && !collapsed && (
              <p className="text-muted-foreground/70 px-2.5 pb-1 text-xs font-medium tracking-wide uppercase">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                collapsed={collapsed}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-border-subtle flex flex-col gap-0.5 border-t px-3 py-3">
        {secondaryNav
          .flatMap((section) => section.items)
          .map((item) => (
            <NavLink
              key={item.href}
              {...item}
              collapsed={collapsed}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground mt-1 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
