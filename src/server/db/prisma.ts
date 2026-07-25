import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { resolve4 } from "node:dns/promises";

/**
 * Real PrismaClient singleton, backed by a real Neon Postgres database.
 *
 * Neon's per-endpoint hostnames (e.g. `ep-xxxx-pooler.<region>.aws.neon.tech`)
 * resolve IPv6-only in some network environments (confirmed here: this
 * deployment environment has no outbound IPv6 route, so a direct TCP
 * connect to the endpoint hostname fails with ENETUNREACH/ETIMEDOUT).
 * Neon's shared parent domain (`<region>.aws.neon.tech`) DOES carry real
 * IPv4 A records — Neon's edge proxy uses TLS SNI to route connections to
 * the right compute endpoint over those shared IPs, the same pattern
 * Cloudflare and other edge networks use. So: resolve the parent domain's
 * IPv4 address, dial that IP directly, and set `ssl.servername` to the
 * original per-endpoint hostname so SNI routing still lands on the right
 * database. This isn't a sandbox-only hack — any IPv6-restricted network
 * (many corporate networks, some CI runners) would hit the same issue.
 *
 * If DATABASE_URL doesn't point at neon.tech, connect normally (no IPv4
 * override) — this file works for any Postgres-compatible host.
 */

declare global {
  var __btkPrisma: PrismaClient | undefined;
}

async function resolveConnectionConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const isNeon = url.hostname.endsWith(".neon.tech");

  const base = {
    port: Number(url.port) || 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };

  if (!isNeon) {
    return { ...base, host: url.hostname, ssl: { rejectUnauthorized: true } };
  }

  const parentDomain = url.hostname.split(".").slice(1).join(".");
  const addresses = await resolve4(parentDomain);
  if (addresses.length === 0) {
    throw new Error(`No IPv4 address found for Neon parent domain ${parentDomain}`);
  }

  return {
    ...base,
    host: addresses[0],
    ssl: { servername: url.hostname, rejectUnauthorized: true },
  };
}

async function createClient(): Promise<PrismaClient> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set — see docs/ops/environment-variables.md");
  }
  const config = await resolveConnectionConfig(databaseUrl);
  const pool = new Pool(config);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

let clientPromise: Promise<PrismaClient> | undefined;

export function getPrisma(): Promise<PrismaClient> {
  if (!globalThis.__btkPrisma) {
    if (!clientPromise) {
      clientPromise = createClient().then((client) => {
        globalThis.__btkPrisma = client;
        return client;
      });
    }
    return clientPromise;
  }
  return Promise.resolve(globalThis.__btkPrisma);
}
