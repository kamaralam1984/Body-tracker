import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

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
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
