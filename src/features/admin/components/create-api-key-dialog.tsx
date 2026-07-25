"use client";

/**
 * Create-API-key flow, including the real Stripe/GitHub-style one-time
 * reveal step: after `createApiKey()` returns, the modal does NOT close —
 * it swaps into a "Copy your key now" panel showing the full secret, since
 * that's the one and only moment a real API key UI ever shows the complete
 * value. Every other surface in the admin panel (the table, etc.) only ever
 * renders `{prefix}••••{lastFour}`.
 *
 * The mock factory (`createApiKey`) doesn't generate a real full secret —
 * only a `prefix` and `lastFour` — so the "full key" shown in the reveal
 * panel is synthesized here purely for the one-time display (`{prefix}` +
 * 20 masked-looking characters + `{lastFour}`), it is never stored anywhere
 * and never rendered again after this dialog closes.
 *
 * <CreateApiKeyDialog />
 */

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createApiKey } from "../lib/mock-admin-service";
import { useOrganizationsQuery } from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";
import type { ApiKey } from "../types";

const SCOPE_POOL = [
  "read:sessions",
  "write:sessions",
  "read:reports",
  "read:users",
  "write:users",
  "read:analytics",
  "read:activity",
  "write:webhooks",
];

function synthesizeFullKey(key: ApiKey): string {
  return `${key.prefix}${"x".repeat(20)}${key.lastFour}`;
}

export function CreateApiKeyDialog({ className }: { className?: string }) {
  const createApiKeyOpen = useAdminStore((state) => state.createApiKeyOpen);
  const setCreateApiKeyOpen = useAdminStore((state) => state.setCreateApiKeyOpen);
  const addCreatedApiKey = useAdminStore((state) => state.addCreatedApiKey);
  const activeOrganizationId = useAdminStore((state) => state.activeOrganizationId);
  const { data: organizations } = useOrganizationsQuery();

  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(
    activeOrganizationId !== "all" ? activeOrganizationId : "",
  );
  const [isLive, setIsLive] = useState(false);
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const orgOptions = (organizations ?? []).map((org) => ({ value: org.id, label: org.name }));

  function toggleScope(scope: string) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  function reset() {
    setName("");
    setOrganizationId(activeOrganizationId !== "all" ? activeOrganizationId : "");
    setIsLive(false);
    setScopes(new Set());
    setCreatedKey(null);
    setCopied(false);
  }

  function resetAndClose() {
    reset();
    setCreateApiKeyOpen(false);
  }

  function handleSubmit() {
    if (!name.trim() || !organizationId || scopes.size === 0) return;
    const record = createApiKey({
      name: name.trim(),
      organizationId,
      scopes: Array.from(scopes),
      isLive,
    });
    addCreatedApiKey(record);
    setCreatedKey(record);
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(synthesizeFullKey(createdKey));
    setCopied(true);
    toast.success("Copied");
  }

  const canSubmit = Boolean(name.trim()) && Boolean(organizationId) && scopes.size > 0;

  return (
    <Modal
      open={createApiKeyOpen}
      onClose={resetAndClose}
      title={createdKey ? "Your new API key" : "Create API key"}
      description={
        createdKey
          ? "Copy your key now — you won't be able to see it again."
          : "Generate a new key scoped to an organization."
      }
      size="lg"
      footer={
        createdKey ? (
          <Button onClick={resetAndClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Create key
            </Button>
          </>
        )
      }
    >
      <div className={cn("flex flex-col gap-4", className)}>
        {createdKey ? (
          <div className="flex flex-col gap-4">
            <div className="border-warning-600/30 bg-warning-bg flex items-start gap-3 rounded-lg border p-4">
              <KeyRound
                className="text-warning-600 dark:text-warning-500 mt-0.5 size-5 shrink-0"
                strokeWidth={1.75}
              />
              <p className="text-foreground text-sm">
                This is the only time the full key value is shown. Store it somewhere safe — after
                you close this dialog, it will only ever appear masked.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">{createdKey.name}</label>
              <div className="flex items-center gap-2">
                <code className="border-border bg-muted text-foreground flex-1 truncate rounded-md border px-3 py-2 font-mono text-sm">
                  {synthesizeFullKey(createdKey)}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy key"
                >
                  {copied ? <Check className="text-success-600 dark:text-success-500" /> : <Copy />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="api-key-name" className="text-foreground text-sm font-medium">
                Name
              </label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Production backend"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">Organization</label>
              <Select
                options={orgOptions}
                value={organizationId}
                onValueChange={setOrganizationId}
                placeholder="Select an organization"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">Environment</label>
              <ButtonGroup>
                <Button
                  type="button"
                  variant={!isLive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsLive(false)}
                >
                  Test
                </Button>
                <Button
                  type="button"
                  variant={isLive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsLive(true)}
                >
                  Live
                </Button>
              </ButtonGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">Scopes</label>
              <div className="border-border grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {SCOPE_POOL.map((scope) => (
                  <label
                    key={scope}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm"
                  >
                    <Checkbox checked={scopes.has(scope)} onChange={() => toggleScope(scope)} />
                    <span className="font-mono text-xs">{scope}</span>
                  </label>
                ))}
              </div>
              {scopes.size === 0 && (
                <p className="text-muted-foreground text-xs">Select at least one scope.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
