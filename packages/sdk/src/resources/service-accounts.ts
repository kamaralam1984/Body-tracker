import type { KvlClient } from "../client";
import type {
  ApiKeyEnvironment,
  ApiKeyRecord,
  ApiKeyStatus,
  ApiKeyWithSecret,
  ListParams,
  PageResult,
  Scope,
} from "./types";

/** A machine identity, not a human — see the `ServiceAccount` Prisma model. */
export interface ServiceAccount {
  id: string;
  orgId: string;
  name: string;
  status: ApiKeyStatus;
  createdAt: string;
}

export type ListServiceAccountsParams = ListParams;

export interface CreateServiceAccountInput {
  name: string;
}

export interface UpdateServiceAccountInput {
  name?: string;
  status?: ApiKeyStatus;
}

export interface ListServiceAccountApiKeysParams {
  cursor?: string;
  limit?: number;
}

export interface IssueApiKeyInput {
  name: string;
  scopes: Scope[];
  rateLimitPerMinute?: number;
  environment?: ApiKeyEnvironment;
}

export class ServiceAccountsResource {
  constructor(private client: KvlClient) {}

  list(params: ListServiceAccountsParams = {}): Promise<PageResult<ServiceAccount>> {
    return this.client.request({ method: "GET", path: "/service-accounts", query: { ...params } });
  }

  create(input: CreateServiceAccountInput): Promise<ServiceAccount> {
    return this.client.request({ method: "POST", path: "/service-accounts", body: input });
  }

  /** There is no real GET-by-id route for a single service account — only update/delete. */
  update(id: string, input: UpdateServiceAccountInput): Promise<ServiceAccount> {
    return this.client.request({ method: "PATCH", path: `/service-accounts/${id}`, body: input });
  }

  /** Deletes the service account; Prisma cascade revokes all of its API keys. */
  delete(id: string): Promise<{ id: string; deleted: true }> {
    return this.client.request({ method: "DELETE", path: `/service-accounts/${id}` });
  }

  /** Lists API keys previously issued for this service account (secrets never included). */
  listApiKeys(
    id: string,
    params: ListServiceAccountApiKeysParams = {},
  ): Promise<PageResult<ApiKeyRecord>> {
    return this.client.request({
      method: "GET",
      path: `/service-accounts/${id}/api-keys`,
      query: { ...params },
    });
  }

  /** Issues a real machine-to-machine API key — scopes are exactly what's requested, never inherited from a role (a service account has no role). */
  issueApiKey(id: string, input: IssueApiKeyInput): Promise<ApiKeyWithSecret> {
    return this.client.request({
      method: "POST",
      path: `/service-accounts/${id}/api-keys`,
      body: input,
    });
  }
}
