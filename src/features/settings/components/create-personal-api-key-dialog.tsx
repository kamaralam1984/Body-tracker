"use client";

/**
 * Create-personal-access-token flow, mirroring the one-time secret reveal
 * pattern established in `@/features/admin/components/create-api-key-dialog`:
 * after `createPersonalApiKey()` returns, the modal does NOT close — it
 * swaps into a "Copy your token now" panel showing the full value, since
 * that's the one and only moment this UI ever shows the complete secret.
 * Every other surface (the settings table, etc.) only ever renders
 * `{prefix}••••{lastFour}`.
 *
 * The mock factory doesn't generate a real full secret — only a `prefix`
 * and `lastFour` — so the "full token" shown in the reveal panel is
 * synthesized here purely for the one-time display (`{prefix}` + 24
 * masked-looking characters + `{lastFour}`); it is never stored anywhere
 * and never rendered again after this dialog closes.
 *
 * <CreatePersonalApiKeyDialog />
 */

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { createPersonalApiKey, useSettingsStore } from "@/features/settings";
import type { PersonalApiKey } from "@/features/settings";

const SCOPE_POOL = [
  "read:sessions",
  "write:sessions",
  "read:reports",
  "read:activity",
  "read:profile",
];

function synthesizeFullKey(key: PersonalApiKey): string {
  return `${key.prefix}${"x".repeat(24)}${key.lastFour}`;
}

export function CreatePersonalApiKeyDialog() {
  const createApiKeyOpen = useSettingsStore((state) => state.createApiKeyOpen);
  const setCreateApiKeyOpen = useSettingsStore((state) => state.setCreateApiKeyOpen);
  const addCreatedApiKey = useSettingsStore((state) => state.addCreatedApiKey);

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [createdKey, setCreatedKey] = useState<PersonalApiKey | null>(null);
  const [copied, setCopied] = useState(false);

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
    setScopes(new Set());
    setCreatedKey(null);
    setCopied(false);
  }

  function resetAndClose() {
    reset();
    setCreateApiKeyOpen(false);
  }

  function handleSubmit() {
    if (!name.trim() || scopes.size === 0) return;
    const record = createPersonalApiKey({ name: name.trim(), scopes: Array.from(scopes) });
    addCreatedApiKey(record);
    setCreatedKey(record);
  }

  function handleDone() {
    resetAndClose();
    toast.success("Token created");
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(synthesizeFullKey(createdKey));
    setCopied(true);
    toast.success("Copied");
  }

  const canSubmit = Boolean(name.trim()) && scopes.size > 0;

  return (
    <Modal
      open={createApiKeyOpen}
      onClose={resetAndClose}
      title={createdKey ? "Your new personal access token" : "Generate new token"}
      description={
        createdKey
          ? "Copy your token now — you won't be able to see it again."
          : "Personal access tokens act on your behalf. Scope them narrowly."
      }
      size="lg"
      footer={
        createdKey ? (
          <Button onClick={handleDone}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Generate token
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {createdKey ? (
          <div className="flex flex-col gap-4">
            <div className="border-warning-600/30 bg-warning-bg flex items-start gap-3 rounded-lg border p-4">
              <KeyRound
                className="text-warning-600 dark:text-warning-500 mt-0.5 size-5 shrink-0"
                strokeWidth={1.75}
              />
              <p className="text-foreground text-sm">
                This is the only time the full token value is shown. Store it somewhere safe — after
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
                  aria-label="Copy token"
                >
                  {copied ? <Check className="text-success-600 dark:text-success-500" /> : <Copy />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="personal-api-key-name"
                className="text-foreground text-sm font-medium"
              >
                Name
              </label>
              <Input
                id="personal-api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Local development"
                autoFocus
              />
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
