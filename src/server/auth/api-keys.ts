import { createHash, randomBytes } from "node:crypto";
import type { Scope } from "../db/entities";

/** API keys look like `btk_live_<32 hex chars>`; only a SHA-256 hash is ever stored. */
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("hex");
  const plaintext = `btk_live_${secret}`;
  const prefix = plaintext.slice(0, 14);
  const hash = hashApiKey(plaintext);
  return { plaintext, prefix, hash };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function hasScope(scopes: Scope[], required: Scope): boolean {
  return scopes.includes(required);
}
