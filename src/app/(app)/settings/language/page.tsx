"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, type SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TIMEZONES, languageLabel, RTL_LANGUAGES, useSettingsStore } from "@/features/settings";
import type { DateFormat, LanguageCode, TimeFormat, WeekStart } from "@/features/settings";
import { cn } from "@/lib/utils";

const LANGUAGE_CODES: LanguageCode[] = ["en", "hi", "ar", "fr", "de", "es", "ja", "zh"];

const LANGUAGE_OPTIONS: SelectOption[] = LANGUAGE_CODES.map((code) => ({
  value: code,
  label: languageLabel(code),
}));

const TIMEZONE_OPTIONS: SelectOption[] = TIMEZONES.map((tz) => ({
  value: tz,
  label: tz.replace(/_/g, " "),
}));

// A few short UI strings translated for the "Translation preview" below.
// Kept intentionally small (3 strings) — these are the ones we're confident
// translating correctly; we're not attempting to translate the whole app.
const PREVIEW_STRINGS: Record<LanguageCode, { dashboard: string; settings: string; save: string }> =
  {
    en: { dashboard: "Dashboard", settings: "Settings", save: "Save changes" },
    hi: { dashboard: "डैशबोर्ड", settings: "सेटिंग्स", save: "परिवर्तन सहेजें" },
    ar: { dashboard: "لوحة التحكم", settings: "الإعدادات", save: "حفظ التغييرات" },
    fr: {
      dashboard: "Tableau de bord",
      settings: "Paramètres",
      save: "Enregistrer les modifications",
    },
    de: { dashboard: "Übersicht", settings: "Einstellungen", save: "Änderungen speichern" },
    es: { dashboard: "Panel", settings: "Configuración", save: "Guardar cambios" },
    ja: { dashboard: "ダッシュボード", settings: "設定", save: "変更を保存" },
    zh: { dashboard: "仪表盘", settings: "设置", save: "保存更改" },
  };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

function dateExample(pattern: DateFormat, now: Date): string {
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const yyyy = now.getFullYear();
  switch (pattern) {
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
  }
}

function timeExample(format: TimeFormat, now: Date): string {
  const hours24 = now.getHours();
  const minutes = pad(now.getMinutes());
  if (format === "24h") return `${pad(hours24)}:${minutes}`;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const ampm = hours24 >= 12 ? "PM" : "AM";
  return `${hours12}:${minutes} ${ampm}`;
}

const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
];

export default function LanguageRegionSettingsPage() {
  const languageRegion = useSettingsStore((s) => s.languageRegion);
  const setLanguageRegion = useSettingsStore((s) => s.setLanguageRegion);

  const now = new Date();
  const preview = PREVIEW_STRINGS[languageRegion.language];
  const isRtl = RTL_LANGUAGES.has(languageRegion.language);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>Choose the language used across the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Select
            options={LANGUAGE_OPTIONS}
            value={languageRegion.language}
            onValueChange={(value) => setLanguageRegion({ language: value as LanguageCode })}
            className="max-w-xs"
          />

          {isRtl && (
            <Alert variant="info" title="Right-to-left language">
              This language reads right-to-left — full RTL layout support is planned for a future
              release. Your preference is saved, but the interface itself won&apos;t mirror yet.
            </Alert>
          )}

          <div className="border-border-subtle rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Translation preview
            </p>
            <p className="text-foreground mb-3 text-base font-semibold">
              {languageLabel(languageRegion.language)}
            </p>
            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>{preview.dashboard}</span>
              <span>{preview.settings}</span>
              <span>{preview.save}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>Used to display dates and times throughout the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-sm font-medium">Auto-detect</span>
              <span className="text-muted-foreground text-xs">
                Use your browser&apos;s detected timezone automatically.
              </span>
            </div>
            <Switch
              id="auto-detect-timezone"
              checked={languageRegion.autoDetectTimezone}
              onCheckedChange={(checked) =>
                setLanguageRegion(
                  checked
                    ? {
                        autoDetectTimezone: true,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      }
                    : { autoDetectTimezone: false },
                )
              }
            />
          </div>
          <div
            className={cn(
              "max-w-xs",
              languageRegion.autoDetectTimezone && "pointer-events-none opacity-50",
            )}
          >
            <Select
              options={TIMEZONE_OPTIONS}
              value={languageRegion.timezone}
              onValueChange={(value) => setLanguageRegion({ timezone: value })}
            />
          </div>
          {languageRegion.autoDetectTimezone && (
            <p className="text-muted-foreground text-xs">
              Turn off auto-detect to choose a timezone manually.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date &amp; time format</CardTitle>
          <CardDescription>Choose how dates, times, and weeks are displayed.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium">Date format</p>
            <RadioGroup
              value={languageRegion.dateFormat}
              onValueChange={(value) => setLanguageRegion({ dateFormat: value as DateFormat })}
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center gap-2.5">
                  <RadioGroupItem value={option.value} />
                  <span className="text-foreground text-sm">{option.label}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {dateExample(option.value, now)}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium">Time format</p>
            <ButtonGroup>
              {(["12h", "24h"] as TimeFormat[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={languageRegion.timeFormat === value ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setLanguageRegion({ timeFormat: value })}
                >
                  {value === "12h" ? "12-hour" : "24-hour"}
                </Button>
              ))}
            </ButtonGroup>
            <p className="text-muted-foreground text-xs tabular-nums">
              Example: {timeExample(languageRegion.timeFormat, now)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium">Week starts on</p>
            <ButtonGroup>
              {WEEK_START_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={languageRegion.weekStart === option.value ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setLanguageRegion({ weekStart: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
