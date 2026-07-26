import type { KvlClient } from "../client";
import type { ListParams, PageResult } from "./types";

export type UserRole = "owner" | "admin" | "manager" | "member" | "viewer";
export type UserStatus = "active" | "invited" | "suspended";

/** A user record with `passwordHash` omitted (real `sanitizeUser()` output). */
export interface User {
  id: string;
  orgId: string;
  teamId: string | null;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  isPlatformAdmin: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export type ListUsersParams = ListParams;

export interface UpdateMeInput {
  name?: string;
}

export class UsersResource {
  constructor(private client: KvlClient) {}

  /** Users in the caller's own organization. */
  list(params: ListUsersParams = {}): Promise<PageResult<User>> {
    return this.client.request({ method: "GET", path: "/users", query: { ...params } });
  }

  /** The calling user's own profile. */
  me(): Promise<User> {
    return this.client.request({ method: "GET", path: "/users/me" });
  }

  updateMe(input: UpdateMeInput): Promise<User> {
    return this.client.request({ method: "PATCH", path: "/users/me", body: input });
  }

  /** Uploads a single ≤5MB png/jpeg/webp/gif avatar for the caller. */
  updateAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);
    return this.client.request({ method: "POST", path: "/users/me/avatar", formData });
  }

  /** Clears the caller's avatar. */
  removeAvatar(): Promise<User> {
    return this.client.request({ method: "DELETE", path: "/users/me/avatar" });
  }
}
