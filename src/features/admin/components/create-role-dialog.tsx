"use client";

/**
 * Create-custom-role dialog: name + description + an interactive
 * PermissionMatrix seeded empty. Submit is disabled until the role has a
 * name AND at least one permission granted somewhere in the matrix — a
 * zero-permission role isn't meaningfully useful.
 */

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import { createCustomRole, emptyPermissionMatrix } from "../lib/mock-admin-service";
import { PermissionMatrixGrid } from "./permission-matrix";
import type { PermissionMatrix as PermissionMatrixType, Role } from "../types";

const EMPTY_ROLE_ID = "__draft-role__";

function hasAnyPermission(matrix: PermissionMatrixType): boolean {
  return Object.values(matrix).some((actions) => actions.length > 0);
}

export function CreateRoleDialog({ className }: { className?: string }) {
  const createRoleOpen = useAdminStore((s) => s.createRoleOpen);
  const setCreateRoleOpen = useAdminStore((s) => s.setCreateRoleOpen);
  const addCreatedRole = useAdminStore((s) => s.addCreatedRole);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionMatrixType>(() =>
    emptyPermissionMatrix(),
  );

  const draftRole: Role = useMemo(
    () => ({
      id: EMPTY_ROLE_ID,
      name: name || "New role",
      description,
      isCustom: true,
      memberCount: 0,
      permissions,
    }),
    [name, description, permissions],
  );

  const canSubmit = name.trim().length > 0 && hasAnyPermission(permissions);

  function reset() {
    setName("");
    setDescription("");
    setPermissions(emptyPermissionMatrix());
  }

  function handleClose() {
    setCreateRoleOpen(false);
    reset();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const role = createCustomRole({
      name: name.trim(),
      description: description.trim(),
      permissions,
    });
    addCreatedRole(role);
    toast.success("Custom role created");
    handleClose();
  }

  return (
    <Modal
      open={createRoleOpen}
      onClose={handleClose}
      title="Create custom role"
      description="Define a name and a permission matrix for this role."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Create role
          </Button>
        </>
      }
    >
      <div className={cn("flex flex-col gap-5", className)}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role-name" className="text-foreground text-sm font-medium">
            Name
          </label>
          <Input
            id="role-name"
            placeholder="e.g. Billing Manager"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role-description" className="text-foreground text-sm font-medium">
            Description
          </label>
          <Textarea
            id="role-description"
            placeholder="What can this role do?"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">Permissions</span>
          <PermissionMatrixGrid role={draftRole} onChange={setPermissions} />
          {!hasAnyPermission(permissions) && (
            <p className="text-muted-foreground text-xs">
              Grant at least one permission to continue.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
