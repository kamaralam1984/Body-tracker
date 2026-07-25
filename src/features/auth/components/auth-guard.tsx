"use client";

/**
 * Client-side route guard for everything under `(app)`. There's no
 * `middleware.ts`/cookie session in this project (see `useAuth`'s doc
 * comment) — the session lives in `localStorage`, so this is the only
 * place that can check it, and only after mount. Renders nothing while
 * `AuthProvider` is still hydrating, so a genuinely logged-in user never
 * flashes a redirect; an unauthenticated visitor briefly sees a blank
 * frame instead of the dashboard, then bounces to `/login`.
 *
 * <AuthGuard>
 *   <DashboardLayout>{children}</DashboardLayout>
 * </AuthGuard>
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "../context/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="bg-background flex h-dvh items-center justify-center">
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
