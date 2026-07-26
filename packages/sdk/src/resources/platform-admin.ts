import type { KvlClient } from "../client";
import type { ApiKeyRecord, ListParams, PageResult, RevokeReason } from "./types";

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  userCount: number;
  apiKeyCount: number;
}

export interface ListPlatformApiKeysParams extends ListParams {
  /** Narrow the cross-org list down to one organization. */
  orgId?: string;
}

/** A real `ApiKey` from any organization, annotated with its owning org's name/slug. */
export interface PlatformApiKeyRecord extends ApiKeyRecord {
  organizationName: string;
  organizationSlug: string;
}

/**
 * `client.platformAdmin` — real cross-organization administration.
 *
 * Every method here requires a Bearer-token principal with
 * `isPlatformAdmin: true`. This is checked via `requirePlatformAdmin()`, not
 * `requireScope()` — it's orthogonal to in-org roles/scopes. API-key
 * authenticated callers, and ordinary org-scoped Bearer tokens, both get a
 * real 403 (`platform_admin_required`) — this is by design, not a bug in
 * your credentials, so don't spend time debugging scopes if you hit it.
 */
export class PlatformAdminResource {
  constructor(private client: KvlClient) {}

  /** Every real organization on the platform, with real `userCount`/`apiKeyCount` per org. */
  organizations(params: ListParams = {}): Promise<PageResult<PlatformOrganization>> {
    return this.client.request({
      method: "GET",
      path: "/platform/organizations",
      query: { ...params },
    });
  }

  /** Every real API key across every organization (secrets never included). Supports `orgId` to narrow to one org. */
  apiKeys(params: ListPlatformApiKeysParams = {}): Promise<PageResult<PlatformApiKeyRecord>> {
    return this.client.request({ method: "GET", path: "/platform/api-keys", query: { ...params } });
  }

  /** Cross-org revoke — the one mutation exposed to platform admins. Rotation stays a per-tenant self-service action. */
  revokeApiKey(id: string, reason?: RevokeReason): Promise<{ success: true }> {
    return this.client.request({
      method: "DELETE",
      path: `/platform/api-keys/${id}`,
      body: reason ? { reason } : undefined,
    });
  }
}
