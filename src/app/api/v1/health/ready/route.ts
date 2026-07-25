import { NextResponse } from "next/server";
import { getEnv } from "@/server/env";
import { getStore } from "@/server/db/store";

export const dynamic = "force-dynamic";

/**
 * Readiness probe — distinct from `/health` (pure liveness, always fast, no
 * dependency checks). This one validates environment configuration and that
 * the data layer is initialized, matching the container-orchestrator
 * convention of readiness (safe to receive traffic) vs. liveness (process
 * is alive, don't restart it) vs. startup (initial boot still in progress)
 * probes described in the Kubernetes/Docker health-check model.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    getEnv();
    checks.env = { ok: true };
  } catch (error) {
    checks.env = { ok: false, detail: error instanceof Error ? error.message : "invalid" };
  }

  try {
    const store = getStore();
    checks.dataStore = { ok: store.organizations.size > 0 };
  } catch (error) {
    checks.dataStore = {
      ok: false,
      detail: error instanceof Error ? error.message : "unavailable",
    };
  }

  // Real production checks against DATABASE_URL/REDIS_URL land here once
  // src/server/db/store.ts is backed by Prisma+Redis instead of memory —
  // there's nothing to ping in this sandbox's in-memory-store deployment.

  const ready = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ready, checks }, { status: ready ? 200 : 503 });
}
