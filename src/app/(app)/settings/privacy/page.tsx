"use client";

import { useRef, useState } from "react";
import { Download, FileJson, ShieldAlert, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select, type SelectOption } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { exportToPdf } from "@/features/reporting";
import { useConsentSettingsQuery, useSettingsStore } from "@/features/settings";
import type { ConsentSetting } from "@/features/settings";
import { downloadJsonExport } from "@/features/settings/lib/privacy-export";

const FAKE_PROFILE = {
  Name: "Jordan Rivera",
  Email: "jordan@example.com",
  "Account created": "Jan 15, 2025",
  Role: "Performance Coach",
};

type RetentionPeriod = "30d" | "90d" | "1y" | "2y" | "indefinite";

const RETENTION_OPTIONS: SelectOption[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "2y", label: "2 years" },
  { value: "indefinite", label: "Indefinite" },
];

export default function DataPrivacySettingsPage() {
  const { data: consentData, isLoading: consentLoading } = useConsentSettingsQuery();
  const [consents, setConsents] = useState<ConsentSetting[] | null>(null);
  const activeConsents = consents ?? consentData ?? null;

  const [exporting, setExporting] = useState(false);
  const [retention, setRetention] = useState<RetentionPeriod>("2y");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const appearance = useSettingsStore((s) => s.appearance);
  const cameraTracking = useSettingsStore((s) => s.cameraTracking);
  const languageRegion = useSettingsStore((s) => s.languageRegion);
  const notifications = useSettingsStore((s) => s.notifications);
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  const setCameraTracking = useSettingsStore((s) => s.setCameraTracking);
  const setLanguageRegion = useSettingsStore((s) => s.setLanguageRegion);
  const setNotifications = useSettingsStore((s) => s.setNotifications);

  async function handleExportPdf() {
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await exportToPdf(
      "personal-data-export",
      "Personal Data Export",
      ["Field", "Value"],
      Object.entries(FAKE_PROFILE),
    );
    setExporting(false);
    toast.success("Your data export has downloaded");
  }

  function handleExportJson() {
    downloadJsonExport(FAKE_PROFILE, "personal-data-export");
  }

  function toggleConsent(id: string, granted: boolean) {
    const base = activeConsents ?? [];
    setConsents(base.map((c) => (c.id === id ? { ...c, granted } : c)));
    toast.success("Preference updated");
  }

  function handleRetentionChange(value: string) {
    setRetention(value as RetentionPeriod);
    toast.info("Retention period updated");
  }

  function handleBackup() {
    downloadJsonExport(
      { appearance, cameraTracking, languageRegion, notifications },
      "settings-backup",
    );
  }

  function handleRestoreFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && typeof parsed === "object") {
          if (parsed.appearance) setAppearance(parsed.appearance);
          if (parsed.cameraTracking) setCameraTracking(parsed.cameraTracking);
          if (parsed.languageRegion) setLanguageRegion(parsed.languageRegion);
          if (parsed.notifications) setNotifications(parsed.notifications);
          toast.success("Settings restored");
        } else {
          throw new Error("Invalid shape");
        }
      } catch {
        toast.error("That file doesn't look like a valid settings backup");
      }
    };
    reader.onerror = () => {
      toast.error("That file doesn't look like a valid settings backup");
    };
    reader.readAsText(file);
  }

  function handleDeleteConfirm() {
    toast.info("Account deletion isn't wired to a backend yet — this is where it would happen");
    setDeleteOpen(false);
    setDeleteConfirmText("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
          <CardDescription>
            Download a copy of everything associated with your account: profile, sessions, and
            activity history.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={handleExportPdf} loading={exporting}>
            <Download />
            Export data
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportJson}>
            <FileJson />
            Download personal data (JSON)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consent management</CardTitle>
          <CardDescription>Control what data we&apos;re allowed to use and how.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {consentLoading || !activeConsents ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            activeConsents.map((consent) => (
              <div key={consent.id} className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium">{consent.label}</span>
                    {consent.required && <Badge variant="neutral">Required</Badge>}
                  </div>
                  <span className="text-muted-foreground text-xs">{consent.description}</span>
                </div>
                <Switch
                  checked={consent.granted}
                  disabled={consent.required}
                  onCheckedChange={(checked) => toggleConsent(consent.id, checked)}
                  aria-label={consent.label}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data retention</CardTitle>
          <CardDescription>Choose how long your session and activity data is kept.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="info">
            Session recordings and activity data are retained for 24 months, then automatically
            deleted.
          </Alert>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label className="text-foreground text-sm font-medium">Retention period</label>
            <Select
              options={RETENTION_OPTIONS}
              value={retention}
              onValueChange={handleRetentionChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup & restore settings</CardTitle>
          <CardDescription>
            Save a snapshot of your appearance, camera & tracking, language, and notification
            preferences, or restore them from a previous backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={handleBackup}>
            <Download />
            Backup settings
          </Button>
          <Button variant="outline" onClick={() => restoreInputRef.current?.click()}>
            <Upload />
            Restore from backup
          </Button>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={handleRestoreFile}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Irreversible actions related to your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="danger" title="Delete account">
            Permanently deletes your account and all associated data. This action cannot be undone.
          </Alert>
          <Button variant="danger" className="w-fit" onClick={() => setDeleteOpen(true)}>
            <ShieldAlert />
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteConfirmText("");
        }}
        title="Delete account"
        description="This permanently deletes your account and all associated data. This action cannot be undone."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteConfirm}
            >
              Delete my account
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            Type <span className="text-foreground font-semibold">DELETE</span> to confirm.
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}
