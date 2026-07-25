"use client";

/**
 * "Invite user" modal — mounted once by the page with no props besides
 * `className`. Visibility is driven by the store's `inviteUserOpen`, so any
 * call site that wants to open it just does `setInviteUserOpen(true)`.
 *
 * Submitting genuinely validates (non-empty name, a real email shape, an
 * organization, and a role must all be selected — the submit button stays
 * disabled until then) and, on success, creates a real `AdminUser` via the
 * `createAdminUser` mock-service factory and appends it to the store's
 * `createdUsers` so it actually shows up in the user list — not just a
 * closed modal.
 *
 * <InviteUserDialog />
 */

import { useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useOrganizationsQuery, useRolesQuery } from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";
import { createAdminUser } from "../lib/mock-admin-service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORM_ID = "invite-user-form";

export function InviteUserDialog({ className }: { className?: string }) {
  const inviteUserOpen = useAdminStore((state) => state.inviteUserOpen);
  const setInviteUserOpen = useAdminStore((state) => state.setInviteUserOpen);
  const addCreatedUser = useAdminStore((state) => state.addCreatedUser);
  const activeOrganizationId = useAdminStore((state) => state.activeOrganizationId);

  const { data: organizations } = useOrganizationsQuery();
  const { data: roles } = useRolesQuery();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [wasSeededForThisOpen, setWasSeededForThisOpen] = useState(false);

  // Re-seed a fresh, empty form (defaulting the org to the current
  // org-switcher scope, if any) each time the dialog transitions to open.
  if (inviteUserOpen && !wasSeededForThisOpen) {
    setWasSeededForThisOpen(true);
    setName("");
    setEmail("");
    setOrganizationId(activeOrganizationId !== "all" ? activeOrganizationId : "");
    setRoleId("");
  }
  if (!inviteUserOpen && wasSeededForThisOpen) {
    setWasSeededForThisOpen(false);
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const isEmailValid = EMAIL_PATTERN.test(trimmedEmail);
  const isValid =
    trimmedName.length > 0 && isEmailValid && organizationId.length > 0 && roleId.length > 0;

  function handleClose() {
    setInviteUserOpen(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid) return;
    const record = createAdminUser({
      name: trimmedName,
      email: trimmedEmail,
      organizationId,
      roleId,
    });
    addCreatedUser(record);
    const roleName = roles?.find((role) => role.id === roleId)?.name ?? "a member";
    toast.success("Invitation sent", {
      description: `${trimmedName} was invited as ${roleName}.`,
    });
    handleClose();
  }

  return (
    <Modal
      open={inviteUserOpen}
      onClose={handleClose}
      title="Invite user"
      description="Send an invitation to join an organization."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" disabled={!isValid}>
            Send invitation
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={cn("flex flex-col gap-4", className)}>
        <Field label="Name">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jordan Rivera"
            autoFocus
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jordan@acme.com"
            invalid={trimmedEmail.length > 0 && !isEmailValid}
          />
        </Field>
        <Field label="Organization">
          <Select
            options={(organizations ?? []).map((org) => ({ value: org.id, label: org.name }))}
            value={organizationId || undefined}
            onValueChange={setOrganizationId}
            placeholder="Select an organization…"
          />
        </Field>
        <Field label="Role">
          <Select
            options={(roles ?? []).map((role) => ({ value: role.id, label: role.name }))}
            value={roleId || undefined}
            onValueChange={setRoleId}
            placeholder="Select a role…"
          />
        </Field>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-foreground text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
