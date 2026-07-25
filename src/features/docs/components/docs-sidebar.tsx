"use client";

/**
 * The docs portal's left navigation — nested collapsible sections, active-
 * link highlighting, per-item bookmarking, and a "Recently viewed" list.
 * Deliberately separate from the main app's `Sidebar`
 * (`src/components/navigation/sidebar.tsx`): that one navigates the
 * internal dashboard (Camera/Sessions/Admin/etc); this one navigates public
 * SDK documentation — different content, different audience, same visual
 * language (same border/spacing/typography conventions).
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Clock, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DOCS_NAV, findNavItem } from "../lib/docs-nav";
import { useDocsSidebarExtras } from "../hooks/use-docs-sidebar-extras";

export function DocsSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { bookmarks, toggleBookmark, recentlyViewed } = useDocsSidebarExtras();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const recentItems = recentlyViewed.map((href) => findNavItem(href)).filter((i) => i !== null);
  const bookmarkedItems = bookmarks.map((href) => findNavItem(href)).filter((i) => i !== null);

  return (
    <nav aria-label="Documentation" className={cn("flex flex-col gap-6", className)}>
      {bookmarkedItems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
            Bookmarks
          </p>
          {bookmarkedItems.map((item) => (
            <SidebarLink key={item.id} item={item} active={pathname === item.href} />
          ))}
        </div>
      )}

      {recentItems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground flex items-center gap-1.5 px-2 text-xs font-semibold tracking-wide uppercase">
            <Clock className="size-3" strokeWidth={2} />
            Recently viewed
          </p>
          {recentItems.map((item) => (
            <SidebarLink key={item.id} item={item} active={pathname === item.href} />
          ))}
        </div>
      )}

      {DOCS_NAV.map((section) => {
        const collapsed = collapsedSections.has(section.id);
        const Icon = section.icon;
        return (
          <div key={section.id} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="text-foreground hover:text-foreground flex items-center gap-2 px-2 py-1 text-sm font-semibold"
            >
              <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
              <span className="flex-1 text-left">{section.title}</span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-3.5 transition-transform duration-200",
                  collapsed && "-rotate-90",
                )}
                strokeWidth={2}
              />
            </button>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1 pb-1">
                    {section.items.map((item) => (
                      <SidebarLink
                        key={item.id}
                        item={item}
                        active={pathname === item.href}
                        bookmarked={bookmarks.includes(item.href)}
                        onToggleBookmark={() => toggleBookmark(item.href)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarLink({
  item,
  active,
  bookmarked,
  onToggleBookmark,
}: {
  item: { title: string; href: string; badge?: "new" | "beta" | "deprecated" };
  active: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}) {
  return (
    <div className="group relative flex items-center">
      <Link
        href={item.href}
        className={cn(
          "flex-1 rounded-md py-1.5 pr-7 pl-8 text-sm transition-colors duration-150",
          active
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="flex items-center gap-2">
          {item.title}
          {item.badge && (
            <Badge
              variant={item.badge === "deprecated" ? "danger" : "accent"}
              className="text-[10px]"
            >
              {item.badge}
            </Badge>
          )}
        </span>
      </Link>
      {onToggleBookmark && (
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
          className={cn(
            "absolute right-1.5 flex size-6 items-center justify-center rounded-md transition-opacity duration-150",
            bookmarked ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Star
            className={cn(
              "size-3.5",
              bookmarked ? "fill-warning-500 text-warning-500" : "text-muted-foreground",
            )}
            strokeWidth={1.75}
          />
        </button>
      )}
    </div>
  );
}
