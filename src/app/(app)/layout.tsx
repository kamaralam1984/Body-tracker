import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AppearanceEffects } from "@/features/settings";
import { AuthGuard } from "@/features/auth";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppearanceEffects>
        <DashboardLayout>{children}</DashboardLayout>
      </AppearanceEffects>
    </AuthGuard>
  );
}
