import type { KvlClient } from "../client";
import type { ListParams, PageResult } from "./types";

/** A registered OAuth2 client app (secrets never included). */
export interface OAuthClientRecord {
  id: string;
  orgId: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  createdAt: string;
}

/** Only present on the one response that ever includes it — the real plaintext client secret, shown exactly once (creation). */
export interface OAuthClientWithSecret extends OAuthClientRecord {
  clientSecret: string;
}

export interface CreateOAuthClientInput {
  name: string;
  redirectUris: string[];
  scopes: string[];
}

/** Query params for the public consent-page lookup — field names match RFC 6749/7636 exactly (snake_case), since they're sent as-is to the real endpoint. */
export interface AuthorizeParams {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: "S256";
}

export interface AuthorizeLookupResult {
  clientName: string;
  requestedScopes: string[];
  grantableScopes: string[];
  ungrantableScopes: string[];
}

export interface ConsentDecisionInput extends AuthorizeParams {
  approve: boolean;
}

export interface ConsentDecisionResult {
  redirectTo: string;
  /** Only present when `approve` was true. */
  grantedScopes?: string[];
}

export interface ExchangeCodeInput {
  code: string;
  client_id: string;
  client_secret?: string;
  redirect_uri: string;
  code_verifier: string;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  tokenType: "Bearer";
}

/**
 * `client.oauth` — OAuth2 authorization-code + PKCE flow (RFC 6749 + RFC 7636)
 * against this app's own OAuth server, plus CRUD for the OAuth client apps
 * (`client_id`/`client_secret`/redirect URIs) registered under your org.
 * `authorize()` and `exchangeCode()`/`refreshToken()` hit real unauthenticated
 * (or client-authenticated) endpoints — no SDK Bearer/API-key auth is used for
 * those, matching the standard OAuth2 token-endpoint pattern.
 */
export class OAuthResource {
  constructor(private client: KvlClient) {}

  listClients(params: ListParams = {}): Promise<PageResult<OAuthClientRecord>> {
    return this.client.request({ method: "GET", path: "/oauth/clients", query: { ...params } });
  }

  /** The returned `clientSecret` is the real plaintext secret — shown exactly once, store it immediately. */
  createClient(input: CreateOAuthClientInput): Promise<OAuthClientWithSecret> {
    return this.client.request({ method: "POST", path: "/oauth/clients", body: input });
  }

  deleteClient(id: string): Promise<{ id: string; deleted: true }> {
    return this.client.request({ method: "DELETE", path: `/oauth/clients/${id}` });
  }

  /** Public, unauthenticated lookup of a client's display name + grantable scopes — called by a consent page before the user even logs in. */
  authorize(params: AuthorizeParams): Promise<AuthorizeLookupResult> {
    return this.client.request({ method: "GET", path: "/oauth/authorize", query: { ...params } });
  }

  /** Records the logged-in user's approve/deny decision. Requires that user's own Bearer token — granted scopes are the real intersection of what the client is registered for and what the approving user actually has. */
  submitConsent(input: ConsentDecisionInput): Promise<ConsentDecisionResult> {
    return this.client.request({ method: "POST", path: "/oauth/authorize", body: input });
  }

  /** Exchanges a single-use PKCE authorization code for a real access/refresh token pair. */
  exchangeCode(input: ExchangeCodeInput): Promise<OAuthTokenResult> {
    return this.client.request({
      method: "POST",
      path: "/oauth/token",
      body: { grant_type: "authorization_code", ...input },
    });
  }

  /** Exchanges a refresh token (from a prior OAuth token response) for a new access/refresh token pair. */
  refreshToken(refreshToken: string): Promise<OAuthTokenResult> {
    return this.client.request({
      method: "POST",
      path: "/oauth/token",
      body: { grant_type: "refresh_token", refresh_token: refreshToken },
    });
  }
}
