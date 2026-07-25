import { SettingsLayout } from "@/components/layout/settings-layout";

export default function SettingsSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account, organization, and workspace preferences.
        </p>
      </div>
      <SettingsLayout>{children}</SettingsLayout>
    </div>
  );
}
