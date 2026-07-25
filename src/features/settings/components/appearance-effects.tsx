"use client";

/**
 * Applies the persisted Appearance preferences for real — mounted once
 * around the authenticated app shell (`src/app/(app)/layout.tsx`), NOT the
 * root layout, since `/docs` is a public site with no personalization
 * concept to apply. Three genuinely app-wide effects:
 *
 * 1. `data-accent` on <html> — swaps which hue `--accent-*` resolves to
 *    (see the `[data-accent="…"]` rules in globals.css).
 * 2. `data-font-size` on <html> — scales the document root font-size,
 *    which every rem-based utility in the app inherits from.
 * 3. `reducedMotion` — wraps children in Framer Motion's `MotionConfig`,
 *    which every `motion.*` component in the app already respects.
 *
 * Setting DOM attributes here (not React-rendered content) is the same
 * technique `next-themes` itself uses for the `class="dark"` toggle — safe
 * against hydration mismatches because it never touches reconciled markup.
 */

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useSettingsStore } from "../store/settings-store";

export function AppearanceEffects({ children }: { children: React.ReactNode }) {
  const accentColor = useSettingsStore((s) => s.appearance.accentColor);
  const fontSize = useSettingsStore((s) => s.appearance.fontSize);
  const reducedMotion = useSettingsStore((s) => s.appearance.reducedMotion);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  return <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>{children}</MotionConfig>;
}
