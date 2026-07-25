import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AppearanceEffects } from "@/features/settings";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppearanceEffects>
      <DashboardLayout>{children}</DashboardLayout>
    </AppearanceEffects>
  );
}
