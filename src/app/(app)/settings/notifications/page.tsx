"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/features/settings";
import type { DigestFrequency } from "@/features/settings";
import { NotificationToggleList } from "./notification-toggle-list";

const emailNotifications = [
  {
    id: "weekly-summary",
    label: "Weekly summary",
    description: "A digest of your team's performance every Monday.",
  },
  {
    id: "new-session",
    label: "New session recorded",
    description: "Get notified when a member logs a new session.",
  },
  {
    id: "flagged-session",
    label: "Flagged sessions",
    description: "Alerts for sessions that need review.",
  },
  {
    id: "product-updates",
    label: "Product updates",
    description: "News about new features and improvements.",
  },
];

const pushNotifications = [
  {
    id: "push-mentions",
    label: "Mentions",
    description: "When someone mentions you in a comment or note.",
  },
  {
    id: "push-reminders",
    label: "Session reminders",
    description: "Reminders before scheduled sessions.",
  },
];

const DIGEST_OPTIONS: { value: DigestFrequency; label: string; description: string }[] = [
  { value: "daily", label: "Daily", description: "A summary email every day." },
  { value: "weekly", label: "Weekly", description: "A summary email once a week." },
  { value: "never", label: "Never", description: "Don't send digest emails." },
];

export default function NotificationsSettingsPage() {
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotifications = useSettingsStore((s) => s.setNotifications);
  const toggleEmailNotification = useSettingsStore((s) => s.toggleEmailNotification);
  const togglePushNotification = useSettingsStore((s) => s.togglePushNotification);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>Choose what you want to be emailed about.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationToggleList
            items={emailNotifications}
            checked={notifications.email}
            onCheckedChange={(id) => toggleEmailNotification(id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push notifications</CardTitle>
          <CardDescription>Manage alerts sent to your devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationToggleList
            items={pushNotifications}
            checked={notifications.push}
            onCheckedChange={(id) => togglePushNotification(id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digest frequency</CardTitle>
          <CardDescription>How often you&apos;d like a summary of activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={notifications.digestFrequency}
            onValueChange={(value) =>
              setNotifications({ digestFrequency: value as DigestFrequency })
            }
          >
            {DIGEST_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-start gap-2.5">
                <RadioGroupItem value={option.value} className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-foreground text-sm">{option.label}</span>
                  <span className="text-muted-foreground text-xs">{option.description}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet hours</CardTitle>
          <CardDescription>
            Notifications are paused during quiet hours except for critical alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground text-sm font-medium">Enable quiet hours</span>
            <Switch
              id="quiet-hours-enabled"
              checked={notifications.quietHoursEnabled}
              onCheckedChange={(checked) => setNotifications({ quietHoursEnabled: checked })}
            />
          </div>

          {notifications.quietHoursEnabled && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="quiet-hours-start"
                  className="text-muted-foreground text-xs font-medium"
                >
                  From
                </label>
                <Input
                  id="quiet-hours-start"
                  type="time"
                  value={notifications.quietHoursStart}
                  onChange={(e) => setNotifications({ quietHoursStart: e.target.value })}
                  className="w-32"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="quiet-hours-end"
                  className="text-muted-foreground text-xs font-medium"
                >
                  To
                </label>
                <Input
                  id="quiet-hours-end"
                  type="time"
                  value={notifications.quietHoursEnd}
                  onChange={(e) => setNotifications({ quietHoursEnd: e.target.value })}
                  className="w-32"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification preview</CardTitle>
          <CardDescription>A sample of what a notification looks like.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-border-subtle bg-surface flex items-start gap-3 rounded-lg border p-4 shadow-xs">
            <span className="bg-accent mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
              B
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-foreground text-sm font-medium">New session recorded</p>
              <p className="text-muted-foreground text-xs">
                Alex just logged a new session — tap to review.
              </p>
              <p className="text-muted-foreground text-[11px]">Just now</p>
            </div>
          </div>
          {notifications.quietHoursEnabled && (
            <p className="text-muted-foreground mt-3 text-xs">
              Quiet hours are active from {notifications.quietHoursStart} to{" "}
              {notifications.quietHoursEnd} — only critical alerts will come through during that
              window.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
