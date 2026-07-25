"use client";

/**
 * Personal access token table — wraps the generic `DataTable<PersonalApiKey>`.
 * The full secret is NEVER rendered here: tokens are always shown masked as
 * `{prefix}••••{lastFour}` in monospace. The one-time full-value reveal only
 * ever happens in `CreatePersonalApiKeyDialog` right after creation.
 *
 * "Revoke" is a real (if local) mutation: it writes into
 * `useSettingsStore`'s `revokedApiKeyIds` set, which `usePersonalApiKeysQuery`
 * already folds into its returned data, so the row's status badge flips
 * immediately and disables the action.
 *
 * <PersonalApiKeyTable keys={data ?? []} loading={isLoading} />
 */

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate, formatRelativeDate, useSettingsStore } from "@/features/settings";
import type { PersonalApiKey } from "@/features/settings";

const SCOPE_OVERFLOW_LIMIT = 3;

export function PersonalApiKeyTable({
  keys,
  loading,
}: {
  keys: PersonalApiKey[];
  loading?: boolean;
}) {
  const revokedApiKeyIds = useSettingsStore((state) => state.revokedApiKeyIds);
  const revokeApiKey = useSettingsStore((state) => state.revokeApiKey);

  function handleRevoke(key: PersonalApiKey) {
    revokeApiKey(key.id);
    toast.success(`"${key.name}" revoked`);
  }

  const columns: DataTableColumn<PersonalApiKey>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (key) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground truncate text-sm font-medium">{key.name}</span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            {key.prefix}••••{key.lastFour}
          </span>
        </div>
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
      key: "created",
      header: "Created",
      sortable: true,
      sortValue: (key) => new Date(key.createdAt).getTime(),
      render: (key) => (
        <span className="text-muted-foreground text-sm">{formatAbsoluteDate(key.createdAt)}</span>
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
        const revoked = key.status === "revoked" || revokedApiKeyIds.has(key.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={revoked}
            onClick={() => handleRevoke(key)}
            className="text-danger hover:bg-danger-bg hover:text-danger"
          >
            {revoked ? "Revoked" : "Revoke"}
          </Button>
        );
      },
    },
  ];

  return (
    <DataTable
      data={keys}
      columns={columns}
      getRowId={(key) => key.id}
      pageSize={10}
      loading={loading}
      emptyTitle="No personal access tokens yet"
      emptyDescription="Generate a token to authenticate scripts and personal tools as you."
    />
  );
}
