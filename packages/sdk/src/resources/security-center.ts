import type { KvlClient } from "../client";

export interface SecurityCenterOverviewParams {
  /** Keys unused (or never used) since this many days ago count as inactive. Default 30, max 365. */
  inactiveDays?: number;
  /** Keys expiring within this many days count as near-expiration. Default 14, max 90. */
  nearExpirationDays?: number;
}

export interface InactiveApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ExpiringApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  expiresAt: string;
}

export interface CompromisedApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
}

export interface FailedAuthSpike {
  /** Null when the failed request couldn't be attributed to any known key. */
  apiKeyId: string | null;
  count: number;
  distinctIps: number;
  lastAttemptAt: string;
}

/** Real security posture for the caller's org — every section is a genuine query, not a mocked dashboard. */
export interface SecurityCenterOverview {
  inactiveDays: number;
  nearExpirationDays: number;
  inactiveKeys: InactiveApiKeySummary[];
  expiredKeys: ExpiringApiKeySummary[];
  nearExpirationKeys: ExpiringApiKeySummary[];
  /** Manual-flag-only (`revokedReason: "Compromised"`) — this app has no external leaked-key-scanning service, so it never fabricates a "detected" result. */
  compromisedKeys: CompromisedApiKeySummary[];
  /** Derived from real `ApiRequestLog` 401 rows in the last 24h, grouped by API key. */
  failedAuthSpikes: FailedAuthSpike[];
}

/**
 * `client.securityCenter` — real security posture for the caller's org:
 * inactive/expired/near-expiration/compromised API keys plus failed-auth
 * spikes. One real endpoint, not a generic paginated list.
 */
export class SecurityCenterResource {
  constructor(private client: KvlClient) {}

  overview(params: SecurityCenterOverviewParams = {}): Promise<SecurityCenterOverview> {
    return this.client.request({
      method: "GET",
      path: "/security-center/overview",
      query: { ...params },
    });
  }
}
