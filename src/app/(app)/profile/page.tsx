import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProfileTabs } from "./profile-tabs";

export const metadata: Metadata = { title: "Profile" };

const stats = [
  { label: "Sessions logged", value: "428" },
  { label: "Avg. score", value: "91.4" },
  { label: "Current streak", value: "12 days" },
];

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar fallback="Jordan Rivera" size="xl" status="online" />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-foreground text-xl font-semibold tracking-tight">
                Jordan Rivera
              </h1>
              <Badge variant="accent">Performance Coach</Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5" strokeWidth={1.75} />
              San Francisco, US
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/settings">
            <Pencil />
            Edit profile
          </Link>
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-1.5 p-5">
            <p className="text-muted-foreground text-sm font-medium">{stat.label}</p>
            <p className="text-foreground text-2xl font-semibold tracking-tight">{stat.value}</p>
          </Card>
        ))}
      </div>

      <ProfileTabs />
    </div>
  );
}
