"use client";

/**
 * Real create-personal-access-token flow against `/api/v1/api-keys`
 * (`useCreatePersonalApiKeyMutation`). After it returns, the modal does NOT
 * close — it swaps into a "Copy your token now" panel showing the REAL
 * one-time secret (`apiKey` field on the response) — the one and only
 * moment this UI ever shows the complete secret. Every other surface (the
 * settings table, etc.) only ever renders `{keyPrefix}…`.
 *
 * <CreatePersonalApiKeyDialog />
 */

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/features/settings";
import {
  useCreatePersonalApiKeyMutation,
  type CreateApiKeyResult,
} from "../hooks/use-settings-queries";
import { ALL_SCOPES } from "@/server/db/entities";

type ExpirationPreset = "never" | "30" | "90" | "180" | "365" | "custom";
type Environment = "live" | "test";
type KeyType = "secret" | "publishable";

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never expires" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "365 days" },
  { value: "custom", label: "Custom date" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "live", label: "Live" },
  { value: "test", label: "Test" },
];

const KEY_TYPE_OPTIONS = [
  { value: "secret", label: "Secret key — server-side only" },
  { value: "publishable", label: "Publishable key — safe for client-side code" },
];

function expirationToIsoDate(preset: ExpirationPreset, customDate: string): string | undefined {
  if (preset === "never") return undefined;
  if (preset === "custom") return customDate ? new Date(customDate).toISOString() : undefined;
  const days = Number(preset);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function CreatePersonalApiKeyDialog() {
  const createApiKeyOpen = useSettingsStore((state) => state.createApiKeyOpen);
  const setCreateApiKeyOpen = useSettingsStore((state) => state.setCreateApiKeyOpen);
  const createMutation = useCreatePersonalApiKeyMutation();

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [environment, setEnvironment] = useState<Environment>("live");
  const [keyType, setKeyType] = useState<KeyType>("secret");
  const [expirationPreset, setExpirationPreset] = useState<ExpirationPreset>("never");
  const [customDate, setCustomDate] = useState("");
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResult | null>(null);
  const [copied, setCopied] = useState(false);
  // A `useState` lazy initializer (not `useMemo`) is the sanctioned way to
  // run a one-time impure computation like `Date.now()` at mount — its
  // factory is documented to run exactly once, unlike `useMemo`, which the
  // React Compiler's purity check disallows wrapping impure calls in.
  const [minCustomDate] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );

  function toggleScope(scope: string) {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  function handleKeyTypeChange(next: KeyType) {
    setKeyType(next);
    // Publishable keys can't hold write scopes (server enforces this too —
    // this just keeps the picker from offering a combination that would
    // fail on submit).
    if (next === "publishable") {
      setScopes((prev) => new Set([...prev].filter((s) => !s.endsWith(":write"))));
    }
  }

  function reset() {
    setName("");
    setScopes(new Set());
    setEnvironment("live");
    setKeyType("secret");
    setExpirationPreset("never");
    setCustomDate("");
    setCreatedKey(null);
    setCopied(false);
  }

  function resetAndClose() {
    reset();
    setCreateApiKeyOpen(false);
  }

  async function handleSubmit() {
    if (!name.trim() || scopes.size === 0) return;
    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        scopes: Array.from(scopes),
        expiresAt: expirationToIsoDate(expirationPreset, customDate),
        environment,
        keyType,
      });
      setCreatedKey(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create token");
    }
  }

  function handleDone() {
    resetAndClose();
    toast.success("Token created");
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.apiKey);
    setCopied(true);
    toast.success("Copied");
  }

  const canSubmit =
    Boolean(name.trim()) &&
    scopes.size > 0 &&
    (expirationPreset !== "custom" || Boolean(customDate));

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
            <Button onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
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
                  {createdKey.apiKey}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-sm font-medium">Key type</label>
                <Select
                  options={KEY_TYPE_OPTIONS}
                  value={keyType}
                  onValueChange={(value) => handleKeyTypeChange(value as KeyType)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-sm font-medium">Environment</label>
                <Select
                  options={ENVIRONMENT_OPTIONS}
                  value={environment}
                  onValueChange={(value) => setEnvironment(value as Environment)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">Expiration</label>
              <Select
                options={EXPIRATION_OPTIONS}
                value={expirationPreset}
                onValueChange={(value) => setExpirationPreset(value as ExpirationPreset)}
              />
              {expirationPreset === "custom" && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(event) => setCustomDate(event.target.value)}
                  min={minCustomDate}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">Scopes</label>
              {keyType === "publishable" && (
                <p className="text-muted-foreground text-xs">
                  Publishable keys can&apos;t hold write scopes — they&apos;re meant to be safe in
                  client-side code.
                </p>
              )}
              <div className="border-border grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                {ALL_SCOPES.map((scope) => {
                  const disabled = keyType === "publishable" && scope.endsWith(":write");
                  return (
                    <label
                      key={scope}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-1 py-1 text-sm",
                        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                      )}
                    >
                      <Checkbox
                        checked={scopes.has(scope)}
                        disabled={disabled}
                        onChange={() => toggleScope(scope)}
                      />
                      <span className="font-mono text-xs">{scope}</span>
                    </label>
                  );
                })}
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
