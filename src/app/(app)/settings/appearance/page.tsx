"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useSettingsStore } from "@/features/settings";
import type { AccentColor, Density, FontSize, SidebarStyle } from "@/features/settings";
import { cn } from "@/lib/utils";

// Same hue values as the `[data-accent="…"]` palettes defined in globals.css —
// each swatch shows its OWN color, not the currently active accent.
const ACCENT_OPTIONS: { value: AccentColor; label: string; hue: number | null }[] = [
  { value: "indigo", label: "Indigo", hue: 258 },
  { value: "blue", label: "Blue", hue: 230 },
  { value: "emerald", label: "Emerald", hue: 155 },
  { value: "amber", label: "Amber", hue: 80 },
  { value: "rose", label: "Rose", hue: 20 },
  { value: "neutral", label: "Neutral", hue: null },
];

function accentSwatchColor(hue: number | null) {
  return hue === null ? "oklch(0.585 0 0)" : `oklch(0.585 0.118 ${hue})`;
}

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

const SIDEBAR_OPTIONS: { value: SidebarStyle; label: string }[] = [
  { value: "expanded", label: "Expanded" },
  { value: "icon-only", label: "Icon-only" },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export default function AppearanceSettingsPage() {
  const appearance = useSettingsStore((s) => s.appearance);
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  // Reuses the SAME localStorage key the main app sidebar already reads
  // (`src/components/layout/dashboard-layout.tsx`) so this control has a
  // real, immediately-visible effect rather than only recording a preference.
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    "sidebar-collapsed",
    false,
  );

  return (
    <div className={cn("flex flex-col gap-6", appearance.density === "compact" && "gap-4")}>
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose light, dark, or match your system setting.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accent color</CardTitle>
          <CardDescription>
            Used for buttons, links, and highlights throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_OPTIONS.map((option) => {
              const selected = appearance.accentColor === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={selected}
                  onClick={() => setAppearance({ accentColor: option.value })}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    style={{ background: accentSwatchColor(option.hue) }}
                    className={cn(
                      "ring-offset-surface flex size-9 items-center justify-center rounded-full ring-2 ring-offset-2 transition-shadow duration-150",
                      selected ? "ring-foreground" : "hover:ring-border ring-transparent",
                    )}
                  >
                    {selected && (
                      <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">{option.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Density</CardTitle>
          <CardDescription>
            Adjust spacing to fit more on screen, or keep it comfortable. Saved as a preference;
            currently applied to this settings page as a preview of the effect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonGroup>
            {DENSITY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={appearance.density === option.value ? "primary" : "secondary"}
                size="sm"
                onClick={() => setAppearance({ density: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sidebar style</CardTitle>
          <CardDescription>
            Collapse the main navigation to icons only, or keep it expanded with labels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonGroup>
            {SIDEBAR_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={appearance.sidebarStyle === option.value ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setAppearance({ sidebarStyle: option.value });
                  setSidebarCollapsed(option.value === "icon-only");
                }}
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
          <p className="text-muted-foreground mt-2 text-xs">
            {sidebarCollapsed
              ? "The sidebar is currently collapsed to icons."
              : "The sidebar is currently expanded."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Font size</CardTitle>
          <CardDescription>Scales text across the entire app.</CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonGroup>
            {FONT_SIZE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={appearance.fontSize === option.value ? "primary" : "secondary"}
                size="sm"
                onClick={() => setAppearance({ fontSize: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Motion</CardTitle>
          <CardDescription>Reduce or disable animations throughout the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-sm font-medium">Reduce motion</span>
            <span className="text-muted-foreground text-xs">
              Turns off transitions and springs for every animated element.
            </span>
          </div>
          <Switch
            id="reduced-motion"
            checked={appearance.reducedMotion}
            onCheckedChange={(checked) => setAppearance({ reducedMotion: checked })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>A live sample using your current appearance settings.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">
            Primary action
          </Button>
          <Button variant="accent" size="sm">
            Accent action
          </Button>
          <Badge variant="accent">Accent badge</Badge>
          <span
            className={cn(
              "bg-accent size-3 rounded-full",
              !appearance.reducedMotion && "animate-pulse",
            )}
            aria-hidden
          />
          <span className="text-muted-foreground text-xs">
            {appearance.reducedMotion
              ? "Motion reduced — this dot is static."
              : "This dot pulses when motion is on."}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
