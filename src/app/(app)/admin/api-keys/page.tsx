"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiKeyFilterBar,
  ApiKeyTable,
  NoApiKeysEmptyState,
  NoBillingResultsEmptyState,
  filterApiKeys,
  useAdminStore,
  useApiKeysQuery,
} from "@/features/admin";

export default function AdminApiKeysPage() {
  const { data: keys, isLoading } = useApiKeysQuery();
  const apiKeyFilters = useAdminStore((state) => state.apiKeyFilters);
  const activeOrganizationId = useAdminStore((state) => state.activeOrganizationId);
  const setCreateApiKeyOpen = useAdminStore((state) => state.setCreateApiKeyOpen);

  const scoped = useMemo(() => {
    const all = keys ?? [];
    return activeOrganizationId === "all"
      ? all
      : all.filter((k) => k.organizationId === activeOrganizationId);
  }, [keys, activeOrganizationId]);

  const visible = useMemo(() => filterApiKeys(scoped, apiKeyFilters), [scoped, apiKeyFilters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">API Keys</h2>
          <p className="text-muted-foreground text-sm">
            {scoped.length} key{scoped.length === 1 ? "" : "s"}
            {activeOrganizationId === "all" ? " across the platform" : " in this organization"}
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateApiKeyOpen(true)}>
          <Plus />
          Create API key
        </Button>
      </div>

      <ApiKeyFilterBar />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : scoped.length === 0 ? (
        <NoApiKeysEmptyState
          action={
            <Button variant="primary" onClick={() => setCreateApiKeyOpen(true)}>
              Create your first API key
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <NoBillingResultsEmptyState />
      ) : (
        <ApiKeyTable keys={visible} />
      )}
    </div>
  );
}
