import {
  LayoutDashboard,
  LineChart,
  FileText,
  Activity,
  Radar,
  Settings,
  ShieldCheck,
  HelpCircle,
  Palette,
  Video,
  BookOpen,
  Gauge,
} from "lucide-react";
import type { NavSection } from "@/types/nav";

export const primaryNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Camera", href: "/camera", icon: Video },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Intelligence", href: "/intelligence", icon: Gauge },
      { label: "Activity", href: "/activity", icon: Radar },
      { label: "Analytics", href: "/analytics", icon: LineChart },
      { label: "Reports", href: "/reports", icon: FileText },
      { label: "Sessions", href: "/sessions", icon: Activity },
    ],
  },
  {
    title: "Platform",
    items: [{ label: "Admin", href: "/admin", icon: ShieldCheck }],
  },
];

export const secondaryNav: NavSection[] = [
  {
    items: [
      { label: "Design System", href: "/design-system", icon: Palette },
      { label: "Developer Docs", href: "/docs", icon: BookOpen },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Help", href: "/help", icon: HelpCircle },
    ],
  },
];
