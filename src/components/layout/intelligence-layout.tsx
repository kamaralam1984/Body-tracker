"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Footprints,
  Gauge,
  Lightbulb,
  PersonStanding,
  TrendingUp,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";

const intelligenceNav = [
  { label: "Overview", href: "/intelligence", icon: Gauge },
  { label: "Attention", href: "/intelligence/attention", icon: Compass },
  { label: "Posture", href: "/intelligence/posture", icon: PersonStanding },
  { label: "Wellness", href: "/intelligence/wellness", icon: Waves },
  { label: "Movement", href: "/intelligence/movement", icon: Footprints },
  { label: "Insights", href: "/intelligence/insights", icon: Lightbulb },
  { label: "Forecast", href: "/intelligence/forecast", icon: TrendingUp },
];

export function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
        {intelligenceNav.map((item) => {
          const active =
            item.href === "/intelligence" ? pathname === item.href : pathname.startsWith(item.href);
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
  );
}
