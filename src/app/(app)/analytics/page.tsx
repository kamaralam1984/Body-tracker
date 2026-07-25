import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsFilters } from "./analytics-filters";
import { AreaChart } from "@/components/ui/charts/area-chart";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { StackedBar } from "@/components/ui/charts/stacked-bar";
import { Sparkline } from "@/components/ui/charts/sparkline";
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

const trend = [64, 70, 68, 76, 82, 79, 88, 91, 87, 94, 98, 102];
const scoreDistribution = [
  { label: "0-59", value: 18 },
  { label: "60-69", value: 42 },
  { label: "70-79", value: 96 },
  { label: "80-89", value: 154 },
  { label: "90-100", value: 88 },
];

const categoryShare = [
  { label: "Strength", value: 38, colorClassName: "bg-accent-500" },
  { label: "Mobility", value: 27, colorClassName: "bg-neutral-400 dark:bg-neutral-500" },
  { label: "Cardio", value: 21, colorClassName: "bg-neutral-300 dark:bg-neutral-600" },
  { label: "Recovery", value: 14, colorClassName: "bg-neutral-200 dark:bg-neutral-700" },
];

const topMembers = [
  {
    name: "Elena Kowalski",
    sessions: 42,
    avgScore: 95,
    change: "+4.2%",
    trend: [88, 90, 91, 93, 94, 95],
  },
  {
    name: "Sarah Chen",
    sessions: 38,
    avgScore: 92,
    change: "+2.8%",
    trend: [85, 87, 88, 90, 91, 92],
  },
  {
    name: "Marcus Webb",
    sessions: 35,
    avgScore: 88,
    change: "+1.1%",
    trend: [84, 85, 86, 87, 87, 88],
  },
  {
    name: "Priya Nair",
    sessions: 31,
    avgScore: 84,
    change: "-0.6%",
    trend: [86, 85, 85, 84, 84, 84],
  },
  {
    name: "Diego Alvarez",
    sessions: 27,
    avgScore: 79,
    change: "-2.3%",
    trend: [83, 82, 81, 80, 79, 79],
  },
];

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Deep dive into performance trends across your organization."
        actions={
          <Button variant="outline" size="md">
            <Download />
            Download report
          </Button>
        }
      />

      <AnalyticsFilters />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Session volume trend</CardTitle>
            <CardDescription>Tracked sessions across the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={trend}
              labels={[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions by category</CardTitle>
            <CardDescription>Share of total tracked sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <StackedBar data={categoryShare} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Top performing members</CardTitle>
            <CardDescription>Ranked by average session score this period.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Avg. score</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMembers.map((member) => (
                  <TableRow key={member.name}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar fallback={member.name} size="sm" />
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.sessions}</TableCell>
                    <TableCell className="font-medium">{member.avgScore}</TableCell>
                    <TableCell>
                      <Sparkline data={member.trend} className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.change.startsWith("-") ? "danger" : "success"}>
                        {member.change}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
            <CardDescription>Session count by score band.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={scoreDistribution} height={180} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
