"use client";

/**
 * Real cross-org API key table for `admin/api-keys` — backed by
 * `/api/v1/platform/api-keys` (see `use-platform-queries.ts`). Replaces
 * the old `ApiKeyTable`, which rendered 18 entirely fabricated keys
 * across 8 fictional organizations with `toast`-stub row actions. Every
 * row here is a real `ApiKey`, with its real owning organization's name
 * shown directly in the table (this is genuinely cross-org data now, so
 * unlike the personal `settings/api` table, the org has to be visible).
 *
 * Only "Revoke" is wired to a real mutation — see the doc comment on the
 * platform DELETE route for why rotate isn't exposed here.
 */

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate, formatRelativeDate } from "../lib/admin-format";
import {
  useRevokePlatformApiKeyMutation,
  type PlatformApiKey,
} from "../hooks/use-platform-queries";
import { REVOKE_REASONS, type RevokeReason } from "@/features/settings/types";

const SCOPE_OVERFLOW_LIMIT = 2;
const REVOKE_REASON_OPTIONS = REVOKE_REASONS.map((reason) => ({ value: reason, label: reason }));

export function PlatformApiKeyTable({
  keys,
  loading,
}: {
  keys: PlatformApiKey[];
  loading?: boolean;
}) {
  const revokeMutation = useRevokePlatformApiKeyMutation();
  const [revokingKey, setRevokingKey] = useState<PlatformApiKey | null>(null);
  const [revokeReason, setRevokeReason] = useState<RevokeReason>("Manual");

  async function confirmRevoke() {
    if (!revokingKey) return;
    try {
      await revokeMutation.mutateAsync({ id: revokingKey.id, reason: revokeReason });
      toast.success(`"${revokingKey.name}" revoked (${revokingKey.organizationName})`);
      setRevokingKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke key");
    }
  }

  const columns: DataTableColumn<PlatformApiKey>[] = [
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
      key: "organization",
      header: "Organization",
      render: (key) => (
        <span className="text-foreground truncate text-sm">{key.organizationName}</span>
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
        <Badge variant={key.status === "active" ? "success" : "neutral"} className="capitalize">
          {key.status}
        </Badge>
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
      key: "created",
      header: "Created",
      sortable: true,
      sortValue: (key) => new Date(key.createdAt).getTime(),
      render: (key) => (
        <span className="text-muted-foreground text-sm">{formatAbsoluteDate(key.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (key) => {
        const revoked = key.status !== "active";
        return (
          <DropdownMenu
            placement="bottom-end"
            trigger={
              <button
                type="button"
                aria-label={`Actions for ${key.name}`}
                className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none"
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </button>
            }
          >
            <DropdownMenuItem
              destructive
              disabled={revoked}
              onSelect={() => {
                setRevokingKey(key);
                setRevokeReason("Manual");
              }}
            >
              {revoked ? "Already revoked" : "Revoke"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenu>
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
        emptyTitle="No API keys"
        emptyDescription="No API keys match the current filters."
      />

      <Modal
        open={Boolean(revokingKey)}
        onClose={() => setRevokingKey(null)}
        title={`Revoke "${revokingKey?.name}"?`}
        description={`This key belongs to ${revokingKey?.organizationName}. Revoking it as a platform administrator notifies its owner and cannot be undone.`}
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
    </>
  );
}
