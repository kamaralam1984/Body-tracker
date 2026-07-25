import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Download, Gauge, Plus, Target, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Dashboard" };

const stats = [
  {
    label: "Total sessions",
    value: "1,284",
    delta: { value: "+12.4%", direction: "up" as const },
    trend: [12, 18, 14, 22, 19, 26, 24, 30, 28, 34],
    icon: Activity,
  },
  {
    label: "Avg. session score",
    value: "86.2",
    delta: { value: "+3.1%", direction: "up" as const },
    trend: [70, 72, 74, 73, 78, 80, 79, 83, 85, 86],
    icon: Gauge,
  },
  {
    label: "Active members",
    value: "342",
    delta: { value: "+8.7%", direction: "up" as const },
    trend: [280, 290, 295, 300, 305, 312, 318, 325, 330, 342],
    icon: Users,
  },
  {
    label: "Completion rate",
    value: "94.8%",
    delta: { value: "-1.2%", direction: "down" as const },
    trend: [96, 95, 97, 96, 95, 94, 95, 94, 95, 94.8],
    icon: Target,
  },
];

const weeklySessions = [
  { label: "Mon", value: 142 },
  { label: "Tue", value: 168 },
  { label: "Wed", value: 155 },
  { label: "Thu", value: 189 },
  { label: "Fri", value: 201 },
  { label: "Sat", value: 96 },
  { label: "Sun", value: 74 },
];

const activity = [
  { name: "Sarah Chen", action: "completed a mobility assessment", time: "12m ago" },
  { name: "Marcus Webb", action: "hit a new personal best", time: "48m ago" },
  { name: "Priya Nair", action: "joined the Strength cohort", time: "1h ago" },
  { name: "Diego Alvarez", action: "flagged a form deviation", time: "2h ago" },
  { name: "Elena Kowalski", action: "completed weekly review", time: "3h ago" },
];

const recentSessions = [
  {
    member: "Sarah Chen",
    type: "Mobility",
    duration: "32 min",
    score: 92,
    date: "Jul 24, 2026",
    status: "Completed",
  },
  {
    member: "Marcus Webb",
    type: "Strength",
    duration: "48 min",
    score: 88,
    date: "Jul 24, 2026",
    status: "Completed",
  },
  {
    member: "Priya Nair",
    type: "Cardio",
    duration: "27 min",
    score: 79,
    date: "Jul 23, 2026",
    status: "Completed",
  },
  {
    member: "Diego Alvarez",
    type: "Recovery",
    duration: "20 min",
    score: 65,
    date: "Jul 23, 2026",
    status: "Flagged",
  },
  {
    member: "Elena Kowalski",
    type: "Strength",
    duration: "51 min",
    score: 95,
    date: "Jul 22, 2026",
    status: "Completed",
  },
];

const statusVariant: Record<string, "success" | "warning" | "neutral"> = {
  Completed: "success",
  Flagged: "warning",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your team's performance this week."
        actions={
          <>
            <Button variant="outline" size="md">
              <Download />
              Export
            </Button>
            <Button variant="primary" size="md">
              <Plus />
              New session
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Sessions this week</CardTitle>
              <CardDescription>Volume of tracked sessions across the team.</CardDescription>
            </div>
            <Badge variant="accent">+18.2% vs last week</Badge>
          </CardHeader>
          <CardContent>
            <BarChart data={weeklySessions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest updates from your team.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {activity.map((item) => (
              <div key={`${item.name}-${item.time}`} className="flex items-start gap-3">
                <Avatar fallback={item.name} size="sm" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-foreground text-sm">
                    <span className="font-medium">{item.name}</span> {item.action}
                  </p>
                  <p className="text-muted-foreground text-xs">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>The latest tracked sessions across your workspace.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sessions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.map((session) => (
                <TableRow key={`${session.member}-${session.date}`}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar fallback={session.member} size="sm" />
                      <span className="font-medium">{session.member}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{session.type}</TableCell>
                  <TableCell className="text-muted-foreground">{session.duration}</TableCell>
                  <TableCell className="font-medium">{session.score}</TableCell>
                  <TableCell className="text-muted-foreground">{session.date}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[session.status] ?? "neutral"}>
                      {session.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
