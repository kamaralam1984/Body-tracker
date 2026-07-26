import { createHash, randomBytes } from "node:crypto";
import type { Scope } from "../db/entities";

export type ApiKeyEnvironment = "test" | "live";
export type ApiKeyType = "secret" | "publishable";

/**
 * Real Stripe-style prefix encoding — `sk_live_`/`sk_test_` for secret keys
 * (server-side only), `pk_live_`/`pk_test_` for publishable keys (safe to
 * embed client-side, creation-time restricted to read-only-eligible scopes
 * — see `isScopeGrantableToPublishableKey` and the create route). Older
 * keys issued before this existed keep their `btk_live_` prefix — nothing
 * about lookup/hashing cares what the prefix contains, so they keep
 * working unchanged.
 */
export function generateApiKey(
  options: { environment?: ApiKeyEnvironment; keyType?: ApiKeyType } = {},
): { plaintext: string; prefix: string; hash: string } {
  const environment = options.environment ?? "live";
  const keyType = options.keyType ?? "secret";
  const typePrefix = keyType === "publishable" ? "pk" : "sk";
  const secret = randomBytes(24).toString("hex");
  const plaintext = `${typePrefix}_${environment}_${secret}`;
  const prefix = plaintext.slice(0, 14);
  const hash = hashApiKey(plaintext);
  return { plaintext, prefix, hash };
}

/** Publishable keys are meant to be safe in client-side code — never grantable a `*:write` scope. */
export function isScopeGrantableToPublishableKey(scope: string): boolean {
  return !scope.endsWith(":write");
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function hasScope(scopes: Scope[], required: Scope): boolean {
  return scopes.includes(required);
}
