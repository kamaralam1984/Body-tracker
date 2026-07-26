/**
 * Real integration tests hit the actual running Body Tracker server —
 * no mock server, no fabricated fixtures. Point `KVL_TEST_BASE_URL` at a
 * running instance (defaults to the local dev/prod server on :3002).
 * If nothing is reachable, every integration test cleanly reports
 * "skipped" instead of failing noisily or silently pretending to pass.
 */
export const BASE_URL = process.env.KVL_TEST_BASE_URL ?? "http://localhost:3002/api/v1";

export const TEST_OWNER = {
  email: "owner@apex-performance.dev",
  password: "OwnerPass123!",
};

let reachable: boolean | null = null;

export async function isServerReachable(): Promise<boolean> {
  if (reachable !== null) return reachable;
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  return reachable;
}
