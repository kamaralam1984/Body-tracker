"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BillingOverview,
  InvoiceFilterBar,
  InvoiceTable,
  NoBillingResultsEmptyState,
  NoInvoicesEmptyState,
  PlanComparison,
  filterInvoices,
  useAdminStore,
  useInvoicesQuery,
  useOrganizationsQuery,
} from "@/features/admin";

export default function AdminBillingPage() {
  const { data: organizations, isLoading: isOrgsLoading } = useOrganizationsQuery();
  const { data: invoices, isLoading: isInvoicesLoading } = useInvoicesQuery();
  const invoiceFilters = useAdminStore((state) => state.invoiceFilters);
  const activeOrganizationId = useAdminStore((state) => state.activeOrganizationId);

  const resolvedOrg = useMemo(() => {
    if (!organizations || organizations.length === 0) return null;
    if (activeOrganizationId !== "all") {
      return organizations.find((o) => o.id === activeOrganizationId) ?? organizations[0];
    }
    return organizations[0];
  }, [organizations, activeOrganizationId]);

  const scopedInvoices = useMemo(() => {
    const all = invoices ?? [];
    return activeOrganizationId === "all"
      ? all
      : all.filter((i) => i.organizationId === activeOrganizationId);
  }, [invoices, activeOrganizationId]);

  const visibleInvoices = useMemo(
    () => filterInvoices(scopedInvoices, invoiceFilters),
    [scopedInvoices, invoiceFilters],
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Billing</h2>
          <p className="text-muted-foreground text-sm">
            {activeOrganizationId === "all" && resolvedOrg
              ? `Showing billing for ${resolvedOrg.name} — select a specific organization above to view another.`
              : "Plan, usage, and payment details for this organization."}
          </p>
        </div>

        {isOrgsLoading || !resolvedOrg ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : (
          <>
            <BillingOverview organization={resolvedOrg} />
            <PlanComparison currentPlanId={resolvedOrg.plan} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Invoices</h2>
          <p className="text-muted-foreground text-sm">
            {scopedInvoices.length} invoice{scopedInvoices.length === 1 ? "" : "s"}
          </p>
        </div>

        <InvoiceFilterBar />

        {isInvoicesLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : scopedInvoices.length === 0 ? (
          <NoInvoicesEmptyState />
        ) : visibleInvoices.length === 0 ? (
          <NoBillingResultsEmptyState />
        ) : (
          <InvoiceTable invoices={visibleInvoices} />
        )}
      </div>
    </div>
  );
}
