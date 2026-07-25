"use client";

/**
 * "Create team" modal — the real wired creation flow for the team management
 * page (unlike membership editing, which `TeamDetailDrawer` intentionally
 * stubs). Reads/writes `createTeamOpen` and appends into `createdTeams` via
 * `useAdminStore`; the record itself comes from the pure `createTeam` factory
 * in `../lib/mock-admin-service`, so the new team is immediately visible
 * anywhere `useTeamsQuery()` is read (it prepends `createdTeams` to the fetched
 * list) — including the team grid, without any extra wiring.
 */

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import { useOrganizationsQuery } from "../hooks/use-admin-queries";
import { createTeam } from "../lib/mock-admin-service";

/** Same department pool the mock service draws from when seeding teams. */
const DEPARTMENT_OPTIONS = [
  "Engineering",
  "Design",
  "Sales",
  "Support",
  "Operations",
  "Marketing",
  "Data Science",
  "Product",
].map((department) => ({ value: department, label: department }));

export function CreateTeamDialog({ className }: { className?: string }) {
  const createTeamOpen = useAdminStore((s) => s.createTeamOpen);
  const setCreateTeamOpen = useAdminStore((s) => s.setCreateTeamOpen);
  const addCreatedTeam = useAdminStore((s) => s.addCreatedTeam);
  const activeOrganizationId = useAdminStore((s) => s.activeOrganizationId);
  const { data: organizations } = useOrganizationsQuery();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [wasOpen, setWasOpen] = useState(createTeamOpen);

  // Reset the form each time the dialog opens, defaulting the org to the
  // active org-switcher scope when one is set. Adjusting state during render
  // (guarded against the previous-render open value) instead of in an effect
  // avoids an extra cascading render pass.
  if (createTeamOpen !== wasOpen) {
    setWasOpen(createTeamOpen);
    if (createTeamOpen) {
      setName("");
      setDepartment("");
      setOrganizationId(activeOrganizationId !== "all" ? activeOrganizationId : "");
    }
  }

  const orgOptions = (organizations ?? []).map((org) => ({ value: org.id, label: org.name }));
  const canSubmit = name.trim().length > 0 && department.length > 0 && organizationId.length > 0;

  function handleClose() {
    setCreateTeamOpen(false);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const record = createTeam({ name: name.trim(), department, organizationId });
    addCreatedTeam(record);
    toast.success("Team created");
    handleClose();
  }

  return (
    <Modal
      open={createTeamOpen}
      onClose={handleClose}
      title="Create team"
      description="Add a new team to organize members and track projects."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Create team
          </Button>
        </>
      }
    >
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-team-name">Team name</Label>
          <Input
            id="create-team-name"
            placeholder="e.g. Platform Engineering"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Department</Label>
          <Select
            options={DEPARTMENT_OPTIONS}
            value={department}
            onValueChange={setDepartment}
            placeholder="Select department"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Organization</Label>
          <Select
            options={orgOptions}
            value={organizationId}
            onValueChange={setOrganizationId}
            placeholder="Select organization"
          />
        </div>
      </div>
    </Modal>
  );
}
