"use client";

import { create } from "zustand";
import { DEFAULT_ADMIN_FILTERS } from "../types";
import type { AdminFilters, AdminUser, Organization, Role, Team } from "../types";

interface AdminState {
  /** The org-switcher context — "all" shows the whole platform, an org id scopes every page to that organization. */
  activeOrganizationId: string;
  setActiveOrganizationId: (id: string) => void;

  userFilters: AdminFilters;
  setUserFilters: (filters: AdminFilters) => void;
  orgFilters: AdminFilters;
  setOrgFilters: (filters: AdminFilters) => void;
  teamFilters: AdminFilters;
  setTeamFilters: (filters: AdminFilters) => void;
  invoiceFilters: AdminFilters;
  setInvoiceFilters: (filters: AdminFilters) => void;
  activityFilters: AdminFilters;
  setActivityFilters: (filters: AdminFilters) => void;

  userDrawerId: string | null;
  openUserDrawer: (id: string) => void;
  closeUserDrawer: () => void;

  orgDrawerId: string | null;
  openOrgDrawer: (id: string) => void;
  closeOrgDrawer: () => void;

  teamDrawerId: string | null;
  openTeamDrawer: (id: string) => void;
  closeTeamDrawer: () => void;

  inviteUserOpen: boolean;
  setInviteUserOpen: (open: boolean) => void;
  createOrgOpen: boolean;
  setCreateOrgOpen: (open: boolean) => void;
  createTeamOpen: boolean;
  setCreateTeamOpen: (open: boolean) => void;
  createRoleOpen: boolean;
  setCreateRoleOpen: (open: boolean) => void;

  selectedUserIds: Set<string>;
  toggleUserSelected: (id: string) => void;
  clearUserSelection: () => void;

  createdUsers: AdminUser[];
  addCreatedUser: (user: AdminUser) => void;
  createdOrganizations: Organization[];
  addCreatedOrganization: (org: Organization) => void;
  createdTeams: Team[];
  addCreatedTeam: (team: Team) => void;
  createdRoles: Role[];
  addCreatedRole: (role: Role) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  activeOrganizationId: "all",
  setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),

  userFilters: DEFAULT_ADMIN_FILTERS,
  setUserFilters: (filters) => set({ userFilters: filters }),
  orgFilters: DEFAULT_ADMIN_FILTERS,
  setOrgFilters: (filters) => set({ orgFilters: filters }),
  teamFilters: DEFAULT_ADMIN_FILTERS,
  setTeamFilters: (filters) => set({ teamFilters: filters }),
  invoiceFilters: DEFAULT_ADMIN_FILTERS,
  setInvoiceFilters: (filters) => set({ invoiceFilters: filters }),
  activityFilters: DEFAULT_ADMIN_FILTERS,
  setActivityFilters: (filters) => set({ activityFilters: filters }),

  userDrawerId: null,
  openUserDrawer: (id) => set({ userDrawerId: id }),
  closeUserDrawer: () => set({ userDrawerId: null }),

  orgDrawerId: null,
  openOrgDrawer: (id) => set({ orgDrawerId: id }),
  closeOrgDrawer: () => set({ orgDrawerId: null }),

  teamDrawerId: null,
  openTeamDrawer: (id) => set({ teamDrawerId: id }),
  closeTeamDrawer: () => set({ teamDrawerId: null }),

  inviteUserOpen: false,
  setInviteUserOpen: (open) => set({ inviteUserOpen: open }),
  createOrgOpen: false,
  setCreateOrgOpen: (open) => set({ createOrgOpen: open }),
  createTeamOpen: false,
  setCreateTeamOpen: (open) => set({ createTeamOpen: open }),
  createRoleOpen: false,
  setCreateRoleOpen: (open) => set({ createRoleOpen: open }),

  selectedUserIds: new Set(),
  toggleUserSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedUserIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedUserIds: next };
    }),
  clearUserSelection: () => set({ selectedUserIds: new Set() }),

  createdUsers: [],
  addCreatedUser: (user) => set({ createdUsers: [user, ...get().createdUsers] }),
  createdOrganizations: [],
  addCreatedOrganization: (org) =>
    set({ createdOrganizations: [org, ...get().createdOrganizations] }),
  createdTeams: [],
  addCreatedTeam: (team) => set({ createdTeams: [team, ...get().createdTeams] }),
  createdRoles: [],
  addCreatedRole: (role) => set({ createdRoles: [role, ...get().createdRoles] }),
}));
