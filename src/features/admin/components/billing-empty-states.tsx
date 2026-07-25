/**
 * Named EmptyState presets for the billing/API-key surfaces — mirrors
 * `src/components/ui/empty-state-presets.tsx`'s pattern (override any field,
 * e.g. `<NoApiKeysEmptyState description="..." />`).
 */

import { KeyRound, Receipt, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface PresetProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NoApiKeysEmptyState({
  title = "No API keys yet",
  description = "Create a key to start authenticating requests against this organization.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={KeyRound}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoInvoicesEmptyState({
  title = "No invoices yet",
  description = "Invoices will appear here once a billing period closes.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={Receipt}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoBillingResultsEmptyState({
  title = "No results match your filters",
  description = "Try adjusting your search, organization, status, or date range.",
  action,
  className,
}: PresetProps) {
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
