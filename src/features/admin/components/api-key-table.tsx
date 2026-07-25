"use client";

/**
 * API key table (Stripe "API keys" page density) — wraps the generic
 * `DataTable<ApiKey>`. The full secret is NEVER rendered here: keys are
 * always shown masked as `{prefix}••••{lastFour}` in monospace, the same
 * way Stripe/GitHub render already-created keys. The one-time full-value
 * reveal only ever happens in `CreateApiKeyDialog` right after creation.
 *
 * Row actions honesty note: "Rotate key", "Revoke", and "Delete" are pure
 * `toast` stubs — there's no backend to rotate/revoke/delete against.
 * "Disable"/"Enable" gets a real (if small) piece of interaction: a local
 * `useState` status-override map keyed by key id, the same technique
 * `session-table.tsx`'s starred-override set uses, so the row visibly
 * flips state and the badge updates immediately — it does not persist
 * anywhere beyond this component instance.
 *
 * <ApiKeyTable keys={filterApiKeys(data, apiKeyFilters)} />
 */

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate, formatCompactNumber, formatRelativeDate } from "../lib/admin-format";
import type { ApiKey, ApiKeyStatus } from "../types";
import { ApiKeyStatusBadge } from "./admin-badges";

const SCOPE_OVERFLOW_LIMIT = 2;

function usageVariant(used: number, max: number): "accent" | "warning" | "danger" {
  if (max <= 0) return "accent";
  const ratio = used / max;
  if (ratio >= 1) return "danger";
  if (ratio >= 0.85) return "warning";
  return "accent";
}

export function ApiKeyTable({ keys, className }: { keys: ApiKey[]; className?: string }) {
  // Local optimistic override for the Disable/Enable action — no store
  // mutation infrastructure exists for API keys, so this is intentionally
  // component-local and resets on remount/refetch.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ApiKeyStatus>>({});

  function effectiveStatus(key: ApiKey): ApiKeyStatus {
    return statusOverrides[key.id] ?? key.status;
  }

  function handleToggleEnabled(key: ApiKey) {
    const next: ApiKeyStatus = effectiveStatus(key) === "active" ? "disabled" : "active";
    setStatusOverrides((prev) => ({ ...prev, [key.id]: next }));
    toast.success(next === "active" ? `"${key.name}" enabled` : `"${key.name}" disabled`);
  }

  function handleRotate(key: ApiKey) {
    toast.info("Key rotation isn't wired to a backend yet", {
      description: `"${key.name}" was not rotated.`,
    });
  }

  function handleRevoke(key: ApiKey) {
    toast.info("Revoking isn't wired to a backend yet", {
      description: `"${key.name}" was not revoked.`,
    });
  }

  function handleDelete(key: ApiKey) {
    toast.info("Deleting isn't wired to a backend yet", {
      description: `"${key.name}" was not deleted.`,
    });
  }

  const columns: DataTableColumn<ApiKey>[] = [
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
      render: (key) => <ApiKeyStatusBadge status={effectiveStatus(key)} />,
    },
    {
      key: "usage",
      header: "Usage",
      render: (key) => (
        <div className="flex w-36 flex-col gap-1">
          <Progress
            value={key.requestsThisMonth}
            max={key.quota}
            size="sm"
            variant={usageVariant(key.requestsThisMonth, key.quota)}
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatCompactNumber(key.requestsThisMonth)} / {formatCompactNumber(key.quota)}
          </span>
        </div>
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
        const enabled = effectiveStatus(key) === "active";
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
            <DropdownMenuItem onSelect={() => handleRotate(key)}>Rotate key</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleToggleEnabled(key)}>
              {enabled ? "Disable" : "Enable"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => handleRevoke(key)}>
              Revoke
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => handleDelete(key)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
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
      emptyTitle="No API keys"
      emptyDescription="No API keys match the current filters."
      className={className}
    />
  );
}
