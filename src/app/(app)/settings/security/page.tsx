"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Laptop, Smartphone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate, formatRelativeDate } from "@/features/settings/lib/settings-format";
import {
  useBackupCodesQuery,
  useLoginHistoryQuery,
  usePasskeysQuery,
} from "@/features/settings/hooks/use-settings-queries";
import type { Passkey } from "@/features/settings/types";
import { SecurityMfaToggle } from "./security-mfa-toggle";

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(12, "Must be at least 12 characters")
      .regex(/\d/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function PasswordCard() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit() {
    toast.success("Password updated");
    reset();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Choose a strong password you don&apos;t use elsewhere.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 sm:max-w-md">
          <FormField
            label="Current password"
            htmlFor="current-password"
            error={errors.currentPassword?.message}
          >
            <Input
              id="current-password"
              type="password"
              placeholder="••••••••"
              invalid={Boolean(errors.currentPassword)}
              {...register("currentPassword")}
            />
          </FormField>
          <FormField
            label="New password"
            htmlFor="new-password"
            hint="At least 12 characters, including a number."
            error={errors.newPassword?.message}
          >
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              invalid={Boolean(errors.newPassword)}
              {...register("newPassword")}
            />
          </FormField>
          <FormField
            label="Confirm new password"
            htmlFor="confirm-password"
            error={errors.confirmPassword?.message}
          >
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Two-factor authentication (authenticator app + backup codes)
// ---------------------------------------------------------------------------

function generateFakeBackupCodes(count = 10): string[] {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function block() {
    let out = "";
    for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }
  return Array.from({ length: count }, () => `${block()}-${block()}`);
}

function TwoFactorCard() {
  const { data: backupCodes, isLoading } = useBackupCodesQuery();
  const [regenOpen, setRegenOpen] = useState(false);
  const [freshCodes, setFreshCodes] = useState<string[]>([]);

  function openRegenerate() {
    setFreshCodes(generateFakeBackupCodes());
    setRegenOpen(true);
  }

  async function handleCopyAll() {
    await navigator.clipboard.writeText(freshCodes.join("\n"));
    toast.success("Copied");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Add an extra layer of security to your account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <SecurityMfaToggle />

        <div className="border-border-subtle flex items-center justify-between gap-4 border-t pt-5">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <p className="text-foreground text-sm font-medium">Authenticator app</p>
              <Badge variant="success">Configured</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Time-based codes from your authenticator app.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.info("Reconfiguring your authenticator isn't wired to a backend yet")
            }
          >
            Reconfigure
          </Button>
        </div>

        <div className="border-border-subtle flex items-center justify-between gap-4 border-t pt-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-foreground text-sm font-medium">Backup codes</p>
            {isLoading ? (
              <Skeleton className="h-3.5 w-48" />
            ) : backupCodes ? (
              <p className="text-muted-foreground text-xs">
                {backupCodes.remainingCodes} of {backupCodes.totalCodes} codes remaining · generated{" "}
                {formatRelativeDate(backupCodes.generatedAt)}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={openRegenerate}>
            Regenerate codes
          </Button>
        </div>
      </CardContent>

      <Modal
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        title="Your new backup codes"
        description="Save these somewhere safe. Each code can only be used once, and your old codes will stop working."
        size="lg"
        footer={<Button onClick={() => setRegenOpen(false)}>Done</Button>}
      >
        <div className="flex flex-col gap-4">
          <div className="border-border bg-muted grid grid-cols-2 gap-2 rounded-lg border p-4 font-mono text-sm sm:grid-cols-2">
            {freshCodes.map((code) => (
              <div key={code} className="text-foreground">
                {code}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="self-start"
          >
            Copy all
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Passkeys
// ---------------------------------------------------------------------------

function PasskeysCard() {
  const { data, isLoading } = usePasskeysQuery();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [addedPasskeys, setAddedPasskeys] = useState<Passkey[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const passkeys = useMemo(() => {
    const all = [...addedPasskeys, ...(data ?? [])];
    return all.filter((p) => !removedIds.has(p.id));
  }, [data, addedPasskeys, removedIds]);

  function handleRemove(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
    toast.success("Passkey removed");
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const passkey: Passkey = {
      id: `pk-new-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    setAddedPasskeys((prev) => [passkey, ...prev]);
    toast.success("Passkey added");
    setNewName("");
    setAddOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Sign in with Face ID, Touch ID, or a security key instead of a password.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-border-subtle flex flex-col divide-y">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : passkeys.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">No passkeys added yet.</p>
        ) : (
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className="bg-muted flex size-9 items-center justify-center rounded-md">
                  <ShieldCheck className="text-muted-foreground size-4" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-foreground text-sm font-medium">{passkey.name}</p>
                  <p className="text-muted-foreground text-xs">
                    Added {formatRelativeDate(passkey.createdAt)}
                    {passkey.lastUsedAt
                      ? ` · last used ${formatRelativeDate(passkey.lastUsedAt)}`
                      : " · never used"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(passkey.id)}>
                Remove
              </Button>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          Add a passkey
        </Button>
      </CardFooter>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a passkey"
        description="Give this passkey a name so you can recognize it later."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newName.trim()}>
              Add
            </Button>
          </>
        }
      >
        <FormField label="Passkey name" htmlFor="passkey-name">
          <Input
            id="passkey-name"
            placeholder="e.g. Work laptop"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
        </FormField>
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recovery email
// ---------------------------------------------------------------------------

function RecoveryEmailCard() {
  const [email, setEmail] = useState("jordan.recovery@example.com");
  const [error, setError] = useState<string | undefined>();

  function handleUpdate() {
    const trimmed = email.trim();
    const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!looksValid) {
      setError("Enter a valid email address");
      return;
    }
    setError(undefined);
    toast.success("Recovery email updated");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery email</CardTitle>
        <CardDescription>
          Used to verify your identity if you lose access to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:max-w-md">
        <FormField label="Email address" htmlFor="recovery-email" error={error}>
          <div className="flex items-center gap-2">
            <Input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={Boolean(error)}
            />
            <Badge variant="success">Verified</Badge>
          </div>
        </FormField>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline" size="sm" onClick={handleUpdate}>
          Update
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Login history
// ---------------------------------------------------------------------------

function LoginHistoryCard() {
  const { data, isLoading } = useLoginHistoryQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login history</CardTitle>
        <CardDescription>Recent sign-in attempts on your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP address</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.device}</TableCell>
                  <TableCell>{entry.location}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.ipAddress}</TableCell>
                  <TableCell>{formatAbsoluteDate(entry.timestamp)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          entry.outcome === "success" ? "bg-success-500" : "bg-danger-500",
                        )}
                      />
                      {entry.outcome === "success" ? "Success" : "Failed"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active sessions
// ---------------------------------------------------------------------------

const INITIAL_SESSIONS = [
  {
    id: "sess-1",
    device: "MacBook Pro",
    location: "San Francisco, US",
    icon: Laptop,
    current: true,
    lastActive: "Active now",
  },
  {
    id: "sess-2",
    device: "iPhone 16 Pro",
    location: "San Francisco, US",
    icon: Smartphone,
    current: false,
    lastActive: "2h ago",
  },
  {
    id: "sess-3",
    device: "Chrome on Windows",
    location: "Denver, US",
    icon: Laptop,
    current: false,
    lastActive: "3d ago",
  },
];

function ActiveSessionsCard() {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  function handleRevoke(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session revoked");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Devices currently signed in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="divide-border-subtle flex flex-col divide-y">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-9 items-center justify-center rounded-md">
                <session.icon className="text-muted-foreground size-4" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-foreground text-sm font-medium">{session.device}</p>
                  {session.current && <Badge variant="accent">This device</Badge>}
                </div>
                <p className="text-muted-foreground text-xs">
                  {session.location} · {session.lastActive}
                </p>
              </div>
            </div>
            {!session.current && (
              <Button variant="ghost" size="sm" onClick={() => handleRevoke(session.id)}>
                Revoke
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Security alerts
// ---------------------------------------------------------------------------

const ALERT_ROWS = [
  {
    id: "new-signin",
    label: "Email me about new sign-ins",
    description: "Get notified when your account is accessed from a new device.",
  },
  {
    id: "password-change",
    label: "Email me about password changes",
    description: "Get notified whenever your password is updated.",
  },
  {
    id: "suspicious-activity",
    label: "Email me about suspicious activity",
    description: "Get notified about unusual account activity.",
  },
];

function SecurityAlertsCard() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "new-signin": true,
    "password-change": true,
    "suspicious-activity": false,
  });

  function handleToggle(id: string, checked: boolean) {
    setEnabled((prev) => ({ ...prev, [id]: checked }));
    toast.info(checked ? "Alert enabled" : "Alert disabled");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security alerts</CardTitle>
        <CardDescription>Choose which security events send you an email.</CardDescription>
      </CardHeader>
      <CardContent className="divide-border-subtle flex flex-col divide-y">
        {ALERT_ROWS.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col gap-0.5">
              <label htmlFor={`alert-${row.id}`} className="text-foreground text-sm font-medium">
                {row.label}
              </label>
              <p className="text-muted-foreground text-xs">{row.description}</p>
            </div>
            <Switch
              id={`alert-${row.id}`}
              checked={enabled[row.id]}
              onCheckedChange={(checked) => handleToggle(row.id, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

export default function SecuritySettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PasswordCard />
      <TwoFactorCard />
      <PasskeysCard />
      <RecoveryEmailCard />
      <LoginHistoryCard />
      <ActiveSessionsCard />
      <SecurityAlertsCard />
    </div>
  );
}
