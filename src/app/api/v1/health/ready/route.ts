import { NextResponse } from "next/server";
import { getEnv } from "@/server/env";
import { getPrisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Readiness probe — distinct from `/health` (pure liveness, always fast, no
 * dependency checks). This one validates environment configuration and
 * that the real Postgres database is actually reachable, matching the
 * container-orchestrator convention of readiness (safe to receive
 * traffic) vs. liveness (process is alive, don't restart it) vs. startup
 * (initial boot still in progress) probes described in the Kubernetes/
 * Docker health-check model. A real outage (bad credentials, Neon down,
 * network partition) makes this correctly report `ready: false`.
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
    const prisma = await getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (error) {
    checks.database = {
      ok: false,
      detail: error instanceof Error ? error.message : "unavailable",
    };
  }

  const ready = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ready, checks }, { status: ready ? 200 : 503 });
}
