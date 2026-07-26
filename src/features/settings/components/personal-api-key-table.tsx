"use client";

/**
 * Personal API key table — real data from `/api/v1/api-keys` (see
 * `usePersonalApiKeysQuery` in `use-settings-queries.ts`). The full secret
 * is NEVER rendered here: keys are always shown masked as `{keyPrefix}` in
 * monospace. The one-time full-value reveal only ever happens in
 * `CreatePersonalApiKeyDialog` (creation) or right after a rotation.
 *
 * Revoke/rotate/scope-edit are all real mutations against the real
 * backend — no client-side-only optimistic state.
 *
 * <PersonalApiKeyTable keys={data ?? []} loading={isLoading} />
 */

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate, formatRelativeDate } from "@/features/settings";
import {
  useRevokePersonalApiKeyMutation,
  useRotatePersonalApiKeyMutation,
} from "../hooks/use-settings-queries";
import { REVOKE_REASONS, type PersonalApiKey, type RevokeReason } from "../types";

const SCOPE_OVERFLOW_LIMIT = 3;
const REVOKE_REASON_OPTIONS = REVOKE_REASONS.map((reason) => ({ value: reason, label: reason }));

export function PersonalApiKeyTable({
  keys,
  loading,
}: {
  keys: PersonalApiKey[];
  loading?: boolean;
}) {
  const revokeMutation = useRevokePersonalApiKeyMutation();
  const rotateMutation = useRotatePersonalApiKeyMutation();
  const [revokingKey, setRevokingKey] = useState<PersonalApiKey | null>(null);
  const [revokeReason, setRevokeReason] = useState<RevokeReason>("Manual");
  const [rotatedSecret, setRotatedSecret] = useState<{ name: string; apiKey: string } | null>(null);

  async function confirmRevoke() {
    if (!revokingKey) return;
    try {
      await revokeMutation.mutateAsync({ id: revokingKey.id, reason: revokeReason });
      toast.success(`"${revokingKey.name}" revoked`);
      setRevokingKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke key");
    }
  }

  async function handleRotate(key: PersonalApiKey) {
    try {
      const result = await rotateMutation.mutateAsync(key.id);
      setRotatedSecret({ name: key.name, apiKey: result.apiKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rotate key");
    }
  }

  const columns: DataTableColumn<PersonalApiKey>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (key) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground truncate text-sm font-medium">{key.name}</span>
          <span className="text-muted-foreground truncate font-mono text-xs">{key.keyPrefix}…</span>
        </div>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      render: (key) => (
        <Badge variant={key.environment === "live" ? "success" : "warning"} className="capitalize">
          {key.environment}
        </Badge>
      ),
    },
    {
      key: "scopes",
      header: "Scopes",
      render: (key) => (
        <div className="flex flex-wrap items-center gap-1">
          {key.scopes.slice(0, SCOPE_OVERFLOW_LIMIT).map((scope) => (
            <Badge key={scope} variant="outline" className="font-mono text-[11px]">
              {scope}
            </Badge>
          ))}
          {key.scopes.length > SCOPE_OVERFLOW_LIMIT && (
            <Badge variant="neutral">+{key.scopes.length - SCOPE_OVERFLOW_LIMIT}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (key) => (
        <div className="flex flex-col gap-0.5">
          <Badge
            variant={key.status === "active" ? "success" : "neutral"}
            className="w-fit capitalize"
          >
            {key.status}
          </Badge>
          {key.gracePeriodEndsAt && key.status === "active" && (
            <span className="text-muted-foreground text-[11px]">
              Rotating out {formatRelativeDate(key.gracePeriodEndsAt)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      sortValue: (key) => new Date(key.createdAt).getTime(),
      render: (key) => (
        <span className="text-muted-foreground text-sm">{formatAbsoluteDate(key.createdAt)}</span>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      render: (key) => (
        <span className={cn("text-sm", !key.expiresAt && "text-muted-foreground")}>
          {key.expiresAt ? formatAbsoluteDate(key.expiresAt) : "Never"}
        </span>
      ),
    },
    {
      key: "lastUsed",
      header: "Last used",
      render: (key) => (
        <span className={cn("text-sm", !key.lastUsedAt && "text-muted-foreground")}>
          {key.lastUsedAt ? formatRelativeDate(key.lastUsedAt) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (key) => {
        const revoked = key.status !== "active";
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={revoked || rotateMutation.isPending}
              onClick={() => handleRotate(key)}
            >
              Rotate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={revoked}
              onClick={() => {
                setRevokingKey(key);
                setRevokeReason("Manual");
              }}
              className="text-danger hover:bg-danger-bg hover:text-danger"
            >
              {revoked ? "Revoked" : "Revoke"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        data={keys}
        columns={columns}
        getRowId={(key) => key.id}
        pageSize={10}
        loading={loading}
        emptyTitle="No personal access tokens yet"
        emptyDescription="Generate a token to authenticate scripts and personal tools as you."
      />

      <Modal
        open={Boolean(revokingKey)}
        onClose={() => setRevokingKey(null)}
        title={`Revoke "${revokingKey?.name}"?`}
        description="Revoked keys cannot authenticate again. This can't be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevokingKey(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRevoke} disabled={revokeMutation.isPending}>
              Revoke
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-medium">Reason</label>
          <Select
            options={[...REVOKE_REASON_OPTIONS]}
            value={revokeReason}
            onValueChange={(value) => setRevokeReason(value as RevokeReason)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(rotatedSecret)}
        onClose={() => setRotatedSecret(null)}
        title={`"${rotatedSecret?.name}" rotated`}
        description="Copy the new secret now — you won't be able to see it again. The old key keeps working during its grace period, then stops automatically."
        footer={<Button onClick={() => setRotatedSecret(null)}>Done</Button>}
      >
        <code className="border-border bg-muted text-foreground block truncate rounded-md border px-3 py-2 font-mono text-sm">
          {rotatedSecret?.apiKey}
        </code>
      </Modal>
    </>
  );
}
