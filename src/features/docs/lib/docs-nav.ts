import { BookOpen, Code2, GraduationCap, LifeBuoy, Rocket } from "lucide-react";
import type { DocNavSection } from "../types";

/**
 * The single source of truth for the docs portal's route map — every page
 * this phase builds MUST live at one of these exact `href`s. Doubles as the
 * sidebar's render data and (via `../lib/search-index.ts`) the search
 * index's page-level entries.
 */
export const DOCS_NAV: DocNavSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: BookOpen,
    items: [{ id: "intro", title: "Introduction", href: "/docs" }],
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    items: [
      { id: "getting-started", title: "Overview & Quick Start", href: "/docs/getting-started" },
      { id: "installation", title: "Installation", href: "/docs/installation" },
      { id: "authentication", title: "Authentication", href: "/docs/authentication" },
    ],
  },
  {
    id: "reference",
    title: "SDK Reference",
    icon: Code2,
    items: [
      { id: "sdk-reference", title: "SDK Reference", href: "/docs/sdk-reference" },
      { id: "api-reference", title: "API Reference", href: "/docs/api-reference" },
      { id: "hooks", title: "React Hooks", href: "/docs/hooks" },
      { id: "events", title: "Events", href: "/docs/events" },
      { id: "api-explorer", title: "API Explorer", href: "/docs/api-explorer", badge: "new" },
    ],
  },
  {
    id: "learn",
    title: "Learn",
    icon: GraduationCap,
    items: [
      { id: "examples", title: "Examples", href: "/docs/examples" },
      { id: "tutorials", title: "Tutorials", href: "/docs/tutorials" },
      { id: "playground", title: "Playground", href: "/docs/playground", badge: "beta" },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    icon: LifeBuoy,
    items: [
      { id: "faq", title: "FAQ", href: "/docs/faq" },
      { id: "changelog", title: "Changelog", href: "/docs/changelog" },
      { id: "migration-guide", title: "Migration Guide", href: "/docs/migration-guide" },
      { id: "status", title: "Status", href: "/docs/status" },
    ],
  },
];

export function findNavItem(href: string) {
  for (const section of DOCS_NAV) {
    const item = section.items.find((i) => i.href === href);
    if (item) return item;
  }
  return null;
}

// Real package metadata — see packages/sdk/package.json and
// packages/react/package.json. Not yet published to npm (real, built,
// tested code — publishing itself is a deliberate opt-in step, see
// INCOMPLETE.md's Phase 10 deploy handoff).
export const SDK_VERSION = "0.1.0";
export const SDK_PACKAGE_NAME = "@kvl/sdk";
export const SDK_REACT_PACKAGE_NAME = "@kvl/react";
export const SDK_GITHUB_URL = "https://github.com/kamaralam1984/Body-tracker";
