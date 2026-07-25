import type { Role, Scope } from "@/server/db/entities";
import { ALL_SCOPES } from "@/server/db/entities";
import type { User as PrismaUser } from "@prisma/client";

/**
 * Shared helpers for the Organizations + Teams + Members + Roles domain.
 *
 * The scope table below intentionally mirrors `ROLE_SCOPES` in
 * `@/server/http/principal` (which we must not modify or import from, since
 * it isn't exported there) so the `/roles` reference endpoint can describe
 * accurately what each role is authorized to do.
 */

export interface RoleDescriptor {
  role: Role;
  label: string;
  description: string;
  defaultScopes: Scope[];
}

export const ROLE_DESCRIPTORS: RoleDescriptor[] = [
  {
    role: "owner",
    label: "Owner",
    description:
      "Full control over the organization, billing, members, and all platform resources. Cannot be removed via the API.",
    defaultScopes: ALL_SCOPES,
  },
  {
    role: "admin",
    label: "Admin",
    description:
      "Manages members, teams, and organization settings with the same operational access as an owner.",
    defaultScopes: ALL_SCOPES,
  },
  {
    role: "manager",
    label: "Manager",
    description:
      "Manages team activity, sessions, and reports, but cannot change organization-level settings.",
    defaultScopes: ALL_SCOPES.filter((scope) => scope !== "organizations:write"),
  },
  {
    role: "member",
    label: "Member",
    description:
      "Standard contributor who can run tracking sessions, view analytics, and generate their own reports.",
    defaultScopes: [
      "sessions:read",
      "sessions:write",
      "tracking:read",
      "tracking:write",
      "analytics:read",
      "reports:read",
      "reports:write",
      "users:read",
      "users:write",
      "api-keys:read",
      "api-keys:write",
      "webhooks:read",
      "webhooks:write",
    ],
  },
  {
    role: "viewer",
    label: "Viewer",
    description: "Read-only access to sessions, tracking data, analytics, and reports.",
    defaultScopes: [
      "sessions:read",
      "tracking:read",
      "analytics:read",
      "reports:read",
      "users:read",
      "api-keys:read",
      "webhooks:read",
    ],
  },
];

export type SanitizedUser = Omit<PrismaUser, "passwordHash">;

/** Strips the password hash before a user record ever leaves the API. */
export function sanitizeUser(user: PrismaUser): SanitizedUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally dropping the secret field
  const { passwordHash, ...rest } = user;
  return rest;
}
