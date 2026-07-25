"use client";

/**
 * The only real entry point into the app — everything under `(app)` now
 * requires a session (see the route guard in `src/app/(app)/layout.tsx`).
 * No sign-up route exists yet; this signs in against the 3 seeded demo
 * accounts (`prisma/seed.ts`) until real account registration ships.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bg-accent-100 dark:bg-accent-900 flex size-11 items-center justify-center rounded-full">
            <Camera className="text-accent-700 dark:text-accent-200 size-5" strokeWidth={1.75} />
          </div>
          <h1 className="text-foreground text-xl font-semibold">Sign in to Body Tracker</h1>
          <p className="text-muted-foreground text-sm">
            Use your organization account to continue.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <FormField label="Email" htmlFor="login-email" required>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </FormField>

              <FormField label="Password" htmlFor="login-password" required>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </FormField>

              {error && <p className="text-danger text-sm">{error}</p>}

              <Button type="submit" loading={submitting} className="mt-1 w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
