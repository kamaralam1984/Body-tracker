"use client";

/**
 * Create-organization flow — the one fully wired write path for this entity
 * (editing existing seeded organizations is an honest stub via
 * `organization-detail-drawer.tsx`'s "Edit organization" button). On submit,
 * builds a real `Organization` record via the pure `createOrganization`
 * factory and adds it to the store so it appears at the top of
 * `useOrganizationsQuery()`'s result immediately.
 *
 * <CreateOrganizationDialog />
 */

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { createOrganization, PLANS } from "../lib/mock-admin-service";
import { formatCurrency } from "../lib/admin-format";
import { useAdminStore } from "../store/admin-store";
import type { OrgPlan } from "../types";

const PLAN_OPTIONS = PLANS.map((plan) => ({
  value: plan.id,
  label: `${plan.name} — ${formatCurrency(plan.priceMonthly)}/mo`,
}));

const DEFAULT_PLAN: OrgPlan = "free";

export function CreateOrganizationDialog({ className }: { className?: string }) {
  const createOrgOpen = useAdminStore((state) => state.createOrgOpen);
  const setCreateOrgOpen = useAdminStore((state) => state.setCreateOrgOpen);
  const addCreatedOrganization = useAdminStore((state) => state.addCreatedOrganization);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<OrgPlan>(DEFAULT_PLAN);

  function resetAndClose() {
    setName("");
    setDomain("");
    setPlan(DEFAULT_PLAN);
    setCreateOrgOpen(false);
  }

  function handleSubmit() {
    if (!name.trim()) return;
    const record = createOrganization({ name: name.trim(), domain: domain.trim(), plan });
    addCreatedOrganization(record);
    toast.success("Organization created");
    resetAndClose();
  }

  return (
    <Modal
      open={createOrgOpen}
      onClose={resetAndClose}
      title="Create organization"
      description="Set up a new organization on the platform."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create organization
          </Button>
        </>
      }
    >
      <div className={className}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="org-name" className="text-foreground text-sm font-medium">
              Name
            </label>
            <Input
              id="org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Corp"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="org-domain" className="text-foreground text-sm font-medium">
              Domain
            </label>
            <Input
              id="org-domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="acme.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium">Plan</label>
            <Select
              options={PLAN_OPTIONS}
              value={plan}
              onValueChange={(value) => setPlan(value as OrgPlan)}
              placeholder="Select a plan"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
