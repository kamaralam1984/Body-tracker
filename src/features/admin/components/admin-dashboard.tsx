"use client";

/**
 * The Executive Overview for `/admin` — the landing page for the whole
 * admin console. Pulls its own data (no props): platform-wide stat tiles,
 * system health, a recent activity feed, and quick actions that open the
 * invite-user / create-org modals other concurrent agents are building.
 */

import { motion, type Variants } from "framer-motion";
import {
  Activity,
  Building2,
  DollarSign,
  Server,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { cn } from "@/lib/utils";
import { useActivityEventsQuery } from "../hooks/use-admin-queries";
import {
  formatCompactNumber,
  formatCurrency,
  formatRelativeDate,
  formatStorage,
} from "../lib/admin-format";
import { computeDashboardStats, computeSystemHealth } from "../lib/mock-admin-service";
import { useAdminStore } from "../store/admin-store";
import { SystemHealthBadge } from "./admin-badges";

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

function UsageTile({
  label,
  icon: Icon,
  value,
  progress,
  progressLabel,
}: {
  label: string;
  icon: typeof Server;
  value: string;
  progress: number;
  progressLabel: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <div className="bg-muted flex size-8 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-foreground text-[1.75rem] leading-none font-semibold tracking-tight">
        {value}
      </p>
      <div className="flex flex-col gap-1.5">
        <Progress value={progress} max={100} size="sm" />
        <p className="text-muted-foreground text-xs">{progressLabel}</p>
      </div>
    </Card>
  );
}

export function AdminDashboard({ className }: { className?: string }) {
  const stats = computeDashboardStats();
  const health = computeSystemHealth();
  const { data: activityEvents, isLoading: activityLoading } = useActivityEventsQuery();
  const setInviteUserOpen = useAdminStore((s) => s.setInviteUserOpen);
  const setCreateOrgOpen = useAdminStore((s) => s.setCreateOrgOpen);

  const recentActivity = activityEvents?.slice(0, 8) ?? [];
  const apiPercent =
    stats.apiRequestsLimit > 0 ? (stats.apiRequestsToday / stats.apiRequestsLimit) * 100 : 0;
  const storagePercent =
    stats.storageLimitGb > 0 ? (stats.storageUsedGb / stats.storageLimitGb) * 100 : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={cn("flex flex-col gap-6", className)}
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">Executive overview</h1>
        <p className="text-muted-foreground text-sm">
          Platform-wide activity across every organization.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <StatTile
            label="Total organizations"
            value={formatCompactNumber(stats.totalOrganizations)}
            icon={Building2}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatTile
            label="Total users"
            value={formatCompactNumber(stats.totalUsers)}
            icon={Users}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatTile
            label="Active users today"
            value={formatCompactNumber(stats.activeUsersToday)}
            icon={UserCheck}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatTile
            label="Total teams"
            value={formatCompactNumber(stats.totalTeams)}
            icon={UsersRound}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatTile label="MRR" value={formatCurrency(stats.mrr)} icon={DollarSign} />
        </motion.div>
        <motion.div variants={itemVariants} className="sm:col-span-2 lg:col-span-1">
          <UsageTile
            label="API requests today"
            icon={Activity}
            value={formatCompactNumber(stats.apiRequestsToday)}
            progress={apiPercent}
            progressLabel={`of ${formatCompactNumber(stats.apiRequestsLimit)} limit`}
          />
        </motion.div>
        <motion.div variants={itemVariants} className="sm:col-span-2 lg:col-span-1">
          <UsageTile
            label="Storage used"
            icon={Server}
            value={formatStorage(stats.storageUsedGb)}
            progress={storagePercent}
            progressLabel={`of ${formatStorage(stats.storageLimitGb)} limit`}
          />
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {health.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-foreground text-sm font-medium">{metric.label}</p>
                  <p className="text-muted-foreground text-xs">{metric.detail}</p>
                </div>
                <SystemHealthBadge status={metric.status} className="shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {activityLoading
              ? Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-3/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              : recentActivity.map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <Avatar src={event.actor.avatarSrc} fallback={event.actor.name} size="sm" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-foreground truncate text-sm">
                        <span className="font-medium">{event.actor.name}</span> {event.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatRelativeDate(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => setInviteUserOpen(true)}>
          <UserPlus />
          Invite user
        </Button>
        <Button variant="secondary" onClick={() => setCreateOrgOpen(true)}>
          <Building2 />
          Create organization
        </Button>
      </motion.div>
    </motion.div>
  );
}
