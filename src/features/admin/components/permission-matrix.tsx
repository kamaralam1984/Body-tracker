"use client";

/**
 * The centerpiece RBAC component: a real, interactive permission grid.
 * Rows = PERMISSION_RESOURCES (8), columns = PERMISSION_ACTIONS (6). Serves
 * two use cases with one implementation:
 *   - read-only: `readOnly` (or omitting `onChange`) renders inert,
 *     disabled checkboxes — used to inspect a built-in role's permissions.
 *   - interactive: toggling a cell calls `onChange` with a new matrix
 *     (pure — the incoming matrix/role is never mutated).
 */

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PERMISSION_ACTIONS, PERMISSION_RESOURCES } from "../types";
import type { Role } from "../types";
import type {
  PermissionMatrix as PermissionMatrixType,
  PermissionResource,
  PermissionAction,
} from "../types";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toggleAction(
  matrix: PermissionMatrixType,
  resource: PermissionResource,
  action: PermissionAction,
): PermissionMatrixType {
  const current = matrix[resource];
  const has = current.includes(action);
  const nextActions = has ? current.filter((a) => a !== action) : [...current, action];
  return { ...matrix, [resource]: nextActions };
}

interface PermissionMatrixGridProps {
  role: Role;
  onChange?: (permissions: PermissionMatrixType) => void;
  readOnly?: boolean;
  className?: string;
}

/** Named `...Grid` to avoid colliding with the `PermissionMatrix` *type* exported from `../types` (both would otherwise re-export under the same name from the feature barrel). */
export function PermissionMatrixGrid({
  role,
  onChange,
  readOnly,
  className,
}: PermissionMatrixGridProps) {
  const isInteractive = !readOnly && Boolean(onChange);

  function handleToggle(resource: PermissionResource, action: PermissionAction) {
    if (!isInteractive || !onChange) return;
    onChange(toggleAction(role.permissions, resource, action));
  }

  return (
    <div className={cn("border-border w-full overflow-x-auto rounded-xl border", className)}>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr>
            <th className="text-muted-foreground h-11 px-4 text-left align-middle text-xs font-medium tracking-wide whitespace-nowrap uppercase">
              Resource
            </th>
            {PERMISSION_ACTIONS.map((action) => (
              <th
                key={action}
                className="text-muted-foreground h-11 px-3 text-center align-middle text-xs font-medium tracking-wide whitespace-nowrap uppercase"
              >
                {capitalize(action)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_RESOURCES.map((resource) => (
            <tr
              key={resource}
              className="border-border hover:bg-muted/40 border-b transition-colors duration-150 last:border-0"
            >
              <td className="text-foreground px-4 py-2.5 align-middle font-medium whitespace-nowrap">
                {capitalize(resource)}
              </td>
              {PERMISSION_ACTIONS.map((action) => {
                const granted = role.permissions[resource].includes(action);
                return (
                  <td key={action} className="px-3 py-2.5 text-center align-middle">
                    <label
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150",
                        isInteractive && "hover:bg-muted cursor-pointer",
                        !isInteractive && "cursor-default",
                      )}
                    >
                      <Checkbox
                        checked={granted}
                        disabled={!isInteractive}
                        onChange={() => handleToggle(resource, action)}
                        aria-label={`${capitalize(action)} ${resource}`}
                      />
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
