import type { KvlClient } from "../client";
import type {
  ApiKeyEnvironment,
  ApiKeyRecord,
  ApiKeyType,
  ApiKeyWithSecret,
  ListParams,
  PageResult,
  RevokeReason,
  RotatedApiKey,
  RotationHistoryEntry,
  Scope,
} from "./types";

export interface CreateApiKeyInput {
  name: string;
  scopes: Scope[];
  rateLimitPerMinute?: number;
  /** Omit for a key that never expires. */
  expiresAt?: string;
  allowedIps?: string[];
  allowedOrigins?: string[];
  environment?: ApiKeyEnvironment;
  keyType?: ApiKeyType;
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: Scope[];
}

/**
 * `client.apiKeys` — personal/service-account API key management. Real
 * rotation has a grace period (both the old and new key work until it
 * passes, not an instant destructive swap) — see `rotate()`.
 */
export class ApiKeysResource {
  constructor(private client: KvlClient) {}

  list(params: ListParams = {}): Promise<PageResult<ApiKeyRecord>> {
    return this.client.request({ method: "GET", path: "/api-keys", query: { ...params } });
  }

  /** The returned `apiKey` field is the real plaintext secret — shown exactly once, store it immediately. */
  create(input: CreateApiKeyInput): Promise<ApiKeyWithSecret> {
    return this.client.request({ method: "POST", path: "/api-keys", body: input });
  }

  update(id: string, input: UpdateApiKeyInput): Promise<ApiKeyRecord> {
    return this.client.request({ method: "PATCH", path: `/api-keys/${id}`, body: input });
  }

  revoke(id: string, reason?: RevokeReason): Promise<{ success: true }> {
    return this.client.request({
      method: "DELETE",
      path: `/api-keys/${id}`,
      body: reason ? { reason } : undefined,
    });
  }

  /** Issues a new secret and starts a grace-period countdown on the old one (`graceHours`, default 24) — both authenticate until it passes. */
  rotate(id: string, graceHours?: number): Promise<RotatedApiKey> {
    return this.client.request({
      method: "POST",
      path: `/api-keys/${id}/rotate`,
      body: graceHours !== undefined ? { graceHours } : undefined,
    });
  }

  /** Real history derived from the audit log, not a separate table. */
  rotationHistory(id: string): Promise<RotationHistoryEntry[]> {
    return this.client.request({ method: "GET", path: `/api-keys/${id}/rotation-history` });
  }
}
