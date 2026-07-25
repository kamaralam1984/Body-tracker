"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SETTINGS_NAV,
  SettingsSearchDialog,
  SettingsSearchTrigger,
  useSettingsSearch,
} from "@/features/settings";
import { cn } from "@/lib/utils";

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSettingsSearch();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <SettingsSearchTrigger onOpen={() => search.setOpen(true)} />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
          {SETTINGS_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <SettingsSearchDialog search={search} />
    </div>
  );
}
