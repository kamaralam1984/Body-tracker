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

  console.log("Seeding team...");
  await prisma.team.upsert({
    where: { id: "team_core" },
    update: {},
    create: { id: "team_core", orgId: "org_apex", name: "Core Team", createdAt: daysAgo(390) },
  });

  const seedUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: Role;
    password: string;
  }> = [
    {
      id: "user_owner",
      email: "owner@apex-performance.dev",
      name: "Riley Sharma",
      role: "owner",
      password: "OwnerPass123!",
    },
    {
      id: "user_admin",
      email: "admin@apex-performance.dev",
      name: "Jordan Blake",
      role: "admin",
      password: "AdminPass123!",
    },
    {
      id: "user_member",
      email: "member@apex-performance.dev",
      name: "Casey Nguyen",
      role: "member",
      password: "MemberPass123!",
    },
  ];

  console.log("Seeding users...");
  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        orgId: "org_apex",
        teamId: "team_core",
        email: u.email,
        passwordHash: hashPassword(u.password),
        name: u.name,
        role: u.role,
        status: "active",
        createdAt: daysAgo(300),
      },
    });
  }

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
