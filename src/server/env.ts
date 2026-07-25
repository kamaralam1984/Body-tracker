import { z } from "zod";

/**
 * Fail-fast environment validation. Only variables the running app actually
 * reads are required — DATABASE_URL/REDIS_URL are validated when present
 * (so docker-compose's real Postgres/Redis wiring is caught if malformed)
 * but are not yet required, since src/server/db/store.ts is still the
 * in-memory stand-in described in prisma/schema.prisma's header comment.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  BTK_JWT_SECRET: z.string().min(1).default("dev-only-insecure-secret-change-in-production"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

declare global {
  var __btkEnv: Env | undefined;
}

export function getEnv(): Env {
  if (globalThis.__btkEnv) return globalThis.__btkEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("[env] invalid environment configuration:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration — see logged field errors above.");
  }

  if (
    result.data.NODE_ENV === "production" &&
    result.data.BTK_JWT_SECRET.startsWith("dev-only-insecure")
  ) {
    console.error(
      "[env] BTK_JWT_SECRET is still the development default in a production environment.",
    );
    throw new Error(
      "Refusing to start in production with the default BTK_JWT_SECRET. Set a real secret.",
    );
  }

  globalThis.__btkEnv = result.data;
  return result.data;
}
