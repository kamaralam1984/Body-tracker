"use client";

import { useState } from "react";
import { Award, CircleCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

const achievements = [
  { title: "100-session milestone", date: "Jun 2026" },
  { title: "Top performer — Q2 2026", date: "Jul 2026" },
  { title: "Perfect mobility score", date: "May 2026" },
];

const activity = [
  { text: "Completed a Strength session", time: "Today, 09:12" },
  { text: "Reviewed 3 flagged sessions", time: "Yesterday, 16:40" },
  { text: "Updated onboarding checklist", time: "Jul 21, 2026" },
  { text: "Joined the Performance Lab workspace", time: "Mar 3, 2025" },
];

const sessions = [
  { type: "Mobility", score: 92, date: "Jul 24, 2026" },
  { type: "Strength", score: 88, date: "Jul 22, 2026" },
  { type: "Cardio", score: 79, date: "Jul 19, 2026" },
];

export function ProfileTabs() {
  const [tab, setTab] = useState("overview");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardContent className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
              <p className="text-foreground text-sm font-semibold">About</p>
              <p className="text-muted-foreground max-w-2xl text-sm">
                Performance coach focused on strength and mobility programming for competitive
                athletes. Leading the Performance Lab team since 2025.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-foreground text-sm font-semibold">Achievements</p>
              <div className="flex flex-col gap-3">
                {achievements.map((achievement) => (
                  <div key={achievement.title} className="flex items-center gap-3">
                    <div className="bg-accent-100 dark:bg-accent-900 flex size-8 items-center justify-center rounded-full">
                      <Award
                        className="text-accent-700 dark:text-accent-200 size-4"
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm font-medium">
                        {achievement.title}
                      </span>
                      <span className="text-muted-foreground text-xs">{achievement.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="activity">
        <Card>
          <CardContent className="divide-border-subtle flex flex-col divide-y p-6">
            {activity.map((item) => (
              <div key={item.text} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <CircleCheck className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
                <p className="text-foreground flex-1 text-sm">{item.text}</p>
                <p className="text-muted-foreground text-xs">{item.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sessions">
        <Card>
          <CardContent className="divide-border-subtle flex flex-col divide-y p-6">
            {sessions.map((session) => (
              <div
                key={`${session.type}-${session.date}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Avatar fallback={session.type} size="sm" />
                <div className="flex flex-1 flex-col">
                  <span className="text-foreground text-sm font-medium">
                    {session.type} session
                  </span>
                  <span className="text-muted-foreground text-xs">{session.date}</span>
                </div>
                <Badge variant="neutral">{session.score}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
