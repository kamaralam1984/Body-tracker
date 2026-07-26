/**
 * Seeds the real Neon Postgres database with the same demo data the old
 * in-memory store (src/server/db/store.ts) used to generate at boot —
 * same org, same 3 demo accounts/passwords, same historical sessions —
 * so nothing about local dev/testing changes except where the data lives.
 *
 * Run with: npx tsx prisma/seed.ts   (or: node --import tsx prisma/seed.ts)
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { getPrisma } from "../src/server/db/prisma";
import { hashPassword } from "../src/server/auth/password";
import { generateApiKey } from "../src/server/auth/api-keys";
import type { Role } from "../src/server/db/entities";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const prisma = await getPrisma();

  console.log("Seeding organization...");
  await prisma.organization.upsert({
    where: { id: "org_apex" },
    update: {},
    create: {
      id: "org_apex",
      name: "Apex Performance Labs",
      slug: "apex-performance",
      plan: "enterprise",
      createdAt: daysAgo(400),
    },
  });

  // A genuine second org — real cross-org data for /api/v1/platform/*
  // (see task #74/#75) to actually have more than one tenant to list.
  console.log("Seeding a second organization (for real cross-org platform-admin data)...");
  await prisma.organization.upsert({
    where: { id: "org_northwind" },
    update: {},
    create: {
      id: "org_northwind",
      name: "Northwind Fitness",
      slug: "northwind-fitness",
      plan: "growth",
      createdAt: daysAgo(120),
    },
  });

  console.log("Seeding team...");
  await prisma.team.upsert({
    where: { id: "team_core" },
    update: {},
    create: { id: "team_core", orgId: "org_apex", name: "Core Team", createdAt: daysAgo(390) },
  });
  await prisma.team.upsert({
    where: { id: "team_northwind_core" },
    update: {},
    create: {
      id: "team_northwind_core",
      orgId: "org_northwind",
      name: "Core Team",
      createdAt: daysAgo(110),
    },
  });

  const seedUsers: Array<{
    id: string;
    orgId: string;
    teamId: string;
    email: string;
    name: string;
    role: Role;
    password: string;
    isPlatformAdmin?: boolean;
  }> = [
    {
      id: "user_owner",
      orgId: "org_apex",
      teamId: "team_core",
      email: "owner@apex-performance.dev",
      name: "Riley Sharma",
      role: "owner",
      password: "OwnerPass123!",
    },
    {
      id: "user_admin",
      orgId: "org_apex",
      teamId: "team_core",
      email: "admin@apex-performance.dev",
      name: "Jordan Blake",
      role: "admin",
      password: "AdminPass123!",
    },
    {
      id: "user_member",
      orgId: "org_apex",
      teamId: "team_core",
      email: "member@apex-performance.dev",
      name: "Casey Nguyen",
      role: "member",
      password: "MemberPass123!",
    },
    {
      id: "user_northwind_owner",
      orgId: "org_northwind",
      teamId: "team_northwind_core",
      email: "owner@northwind-fitness.dev",
      name: "Morgan Ellis",
      role: "owner",
      password: "OwnerPass123!",
    },
    // Deliberately roster-ed as a plain "viewer" in org_apex — their real
    // power comes entirely from `isPlatformAdmin`, not their in-org role
    // (see the schema comment on User.isPlatformAdmin: the two are
    // orthogonal). Seed-only for now — no self-serve "grant platform
    // admin" UI exists.
    {
      id: "user_platform_admin",
      orgId: "org_apex",
      teamId: "team_core",
      email: "platform-admin@bodytracker.dev",
      name: "Taylor Osei",
      role: "viewer",
      password: "PlatformPass123!",
      isPlatformAdmin: true,
    },
  ];

  console.log("Seeding users...");
  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { role: u.role, isPlatformAdmin: u.isPlatformAdmin ?? false },
      create: {
        id: u.id,
        orgId: u.orgId,
        teamId: u.teamId,
        email: u.email,
        passwordHash: hashPassword(u.password),
        name: u.name,
        role: u.role,
        status: "active",
        createdAt: daysAgo(300),
        isPlatformAdmin: u.isPlatformAdmin ?? false,
      },
    });
  }

  console.log("Seeding a real API key for the second org (deterministic cross-org data)...");
  const northwindKey = generateApiKey({ environment: "live", keyType: "secret" });
  await prisma.apiKey.upsert({
    where: { id: "key_northwind_seed" },
    update: {},
    create: {
      id: "key_northwind_seed",
      orgId: "org_northwind",
      userId: "user_northwind_owner",
      name: "Northwind production key",
      keyPrefix: northwindKey.prefix,
      keyHash: northwindKey.hash,
      scopes: ["sessions:read", "analytics:read"],
      status: "active",
      rateLimitPerMinute: 120,
      requestCount: 0,
      lastUsedAt: null,
      expiresAt: null,
      createdAt: daysAgo(60),
      environment: "live",
      keyType: "secret",
    },
  });

  console.log("Seeding historical tracking sessions + analytics snapshots...");
  const kinds = ["squat", "posture-check", "desk-focus", "mobility-flow"];
  for (let i = 0; i < 8; i++) {
    const id = `sess_seed_${i}`;
    const startedAt = daysAgo(8 - i);
    const durationSeconds = 600 + i * 45;

    await prisma.trackingSession.upsert({
      where: { id },
      update: {},
      create: {
        id,
        orgId: "org_apex",
        userId: "user_member",
        title: `Session ${i + 1}`,
        activityKind: kinds[i % kinds.length],
        status: "completed",
        startedAt,
        pausedAt: null,
        endedAt: startedAt,
        durationSeconds,
        repCount: 12 + i * 3,
        caloriesEstimate: 80 + i * 12,
        avgFormScore: 72 + (i % 5) * 4,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    });

    await prisma.analyticsSnapshot.upsert({
      where: { userId_date: { userId: "user_member", date: startedAt } },
      update: {},
      create: {
        id,
        orgId: "org_apex",
        userId: "user_member",
        date: startedAt,
        activeMinutes: Math.round(durationSeconds / 60),
        sessionsCompleted: 1,
        repsTotal: 12 + i * 3,
        avgFormScore: 72 + (i % 5) * 4,
        focusScore: 65 + (i % 6) * 5,
        postureScore: 70 + (i % 4) * 6,
      },
    });
  }

  console.log("Seeding a ready sample report...");
  await prisma.report.upsert({
    where: { id: "rpt_seed_1" },
    update: {},
    create: {
      id: "rpt_seed_1",
      orgId: "org_apex",
      userId: "user_member",
      title: "Weekly Performance Summary",
      format: "pdf",
      status: "ready",
      periodStart: daysAgo(7),
      periodEnd: daysAgo(0),
      createdAt: daysAgo(1),
      readyAt: daysAgo(1),
      sizeBytes: 184_320,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = await getPrisma();
    await prisma.$disconnect();
  });
