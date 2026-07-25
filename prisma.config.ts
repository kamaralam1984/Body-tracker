import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js itself loads `.env.local` automatically for the app, but the
// Prisma CLI is a separate process that only reads plain `.env` by
// default — point dotenv at `.env.local` explicitly so both the app and
// `prisma generate`/`db push` share one real DATABASE_URL, not two copies.
config({ path: ".env.local" });

/**
 * Prisma 7 removed `datasource { url = env(...) }` from schema.prisma —
 * connection config now lives here instead. The Prisma CLI (generate,
 * db push, migrate) reads this file directly; the app's own PrismaClient
 * instantiation (src/server/db/prisma.ts) is separate and uses the same
 * DATABASE_URL via the @prisma/adapter-pg driver adapter.
 *
 * `prisma generate` runs automatically via package.json's `postinstall`
 * script (needed because the generated client lives in node_modules,
 * which isn't committed — a fresh `npm ci` on any machine, including CI
 * and the deploy VPS, needs to regenerate it). `generate` only reads the
 * schema file, it never actually connects to the database, so a real
 * DATABASE_URL isn't required for it to succeed — this fallback exists
 * purely so `npm install` doesn't hard-fail before `.env.local` exists
 * (a fresh clone, or CI with no DATABASE_URL secret configured).
 */
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: databaseUrl },
});
