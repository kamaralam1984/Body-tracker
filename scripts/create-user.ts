/**
 * Creates (or updates the password of) a real login user in the org's
 * production database — for when someone needs a real account beyond the
 * 3 seeded demo users in prisma/seed.ts. Reuses the same org ("org_apex")
 * those demo accounts live in, and the same scrypt password hashing
 * `login()` verifies against (src/server/auth/password.ts) — no new auth
 * mechanism, just another real row in the same real Users table.
 *
 * Run with: npx tsx scripts/create-user.ts <email> <password> <name> [role]
 *   role defaults to "admin" (full access, same as "owner" — see
 *   ROLE_SCOPES in src/server/http/principal.ts). Valid roles: owner,
 *   admin, manager, member, viewer.
 *
 * Safe to re-run: upserts on (orgId, email) — an existing account just gets
 * its password/name/role updated rather than duplicated.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { getPrisma } from "../src/server/db/prisma";
import { hashPassword } from "../src/server/auth/password";
import type { Role } from "../src/server/db/entities";

const ORG_ID = "org_apex";
const VALID_ROLES: Role[] = ["owner", "admin", "manager", "member", "viewer"];

async function main() {
  const [email, password, name, roleArg] = process.argv.slice(2);

  if (!email || !password || !name) {
    console.error("Usage: npx tsx scripts/create-user.ts <email> <password> <name> [role]");
    process.exit(1);
  }

  const role = (roleArg ?? "admin") as Role;
  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}" — must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const prisma = await getPrisma();
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { orgId_email: { orgId: ORG_ID, email: normalizedEmail } },
    update: { passwordHash: hashPassword(password), name, role, status: "active" },
    create: {
      orgId: ORG_ID,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      name,
      role,
      status: "active",
    },
  });

  console.log(`User ready: ${user.email} (role: ${user.role}, id: ${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
