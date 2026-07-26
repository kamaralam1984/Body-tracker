import type { KvlClient } from "../client";
import type { ListParams, Scope } from "./types";

export type OrganizationPlan = "starter" | "growth" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  createdAt: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  plan?: OrganizationPlan;
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

export type ListTeamsParams = ListParams;

export interface CreateTeamInput {
  name: string;
}

export type MemberRole = "owner" | "admin" | "manager" | "member" | "viewer";
export type MemberStatus = "active" | "invited" | "suspended";

/** A user record scoped to an organization, with `passwordHash` omitted (real `sanitizeUser()` output). */
export interface OrganizationMember {
  id: string;
  orgId: string;
  teamId: string | null;
  email: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  isPlatformAdmin: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export type ListMembersParams = ListParams;

export interface InviteMemberInput {
  email: string;
  name: string;
  role: MemberRole;
  teamId?: string | null;
}

export interface UpdateMemberInput {
  role?: MemberRole;
  teamId?: string | null;
  status?: MemberStatus;
}

export interface RoleDescriptor {
  role: MemberRole;
  label: string;
  description: string;
  defaultScopes: Scope[];
}

export class OrganizationsResource {
  constructor(private client: KvlClient) {}

  /** Every real route here is scoped to the caller's own org — `id` must equal the caller's `orgId` or the server returns 403. */
  get(id: string): Promise<Organization> {
    return this.client.request({ method: "GET", path: `/organizations/${id}` });
  }

  update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    return this.client.request({ method: "PATCH", path: `/organizations/${id}`, body: input });
  }

  /** Note: the real route returns the team list as a plain array (pagination info is sent in the response `meta`, which this SDK's transport doesn't surface). */
  teams(id: string, params: ListTeamsParams = {}): Promise<Team[]> {
    return this.client.request({
      method: "GET",
      path: `/organizations/${id}/teams`,
      query: { ...params },
    });
  }

  createTeam(id: string, input: CreateTeamInput): Promise<Team> {
    return this.client.request({ method: "POST", path: `/organizations/${id}/teams`, body: input });
  }

  /** Static reference data — the 5 platform roles and their default scopes. */
  roles(id: string): Promise<RoleDescriptor[]> {
    return this.client.request({ method: "GET", path: `/organizations/${id}/roles` });
  }

  /** Note: like `teams()`, the real route returns a plain array — pagination lives in `meta`, which this SDK doesn't expose. */
  members(id: string, params: ListMembersParams = {}): Promise<OrganizationMember[]> {
    return this.client.request({
      method: "GET",
      path: `/organizations/${id}/members`,
      query: { ...params },
    });
  }

  inviteMember(id: string, input: InviteMemberInput): Promise<OrganizationMember> {
    return this.client.request({
      method: "POST",
      path: `/organizations/${id}/members`,
      body: input,
    });
  }

  updateMember(id: string, userId: string, input: UpdateMemberInput): Promise<OrganizationMember> {
    return this.client.request({
      method: "PATCH",
      path: `/organizations/${id}/members/${userId}`,
      body: input,
    });
  }

  removeMember(id: string, userId: string): Promise<{ id: string; deleted: true }> {
    return this.client.request({
      method: "DELETE",
      path: `/organizations/${id}/members/${userId}`,
    });
  }
}
