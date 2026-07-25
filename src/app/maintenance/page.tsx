import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { BlankLayout } from "@/components/layout/blank-layout";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Scheduled maintenance" };

export default function MaintenancePage() {
  return (
    <BlankLayout className="items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
          <Wrench className="text-muted-foreground size-6" strokeWidth={1.75} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            We&apos;ll be right back
          </h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            {siteConfig.name} is undergoing scheduled maintenance to improve performance and
            reliability.
          </p>
        </div>
        <Badge variant="info">Estimated completion: 45 minutes</Badge>
      </div>
      <p className="text-muted-foreground/70 text-xs">
        Questions? Reach us at{" "}
        <a
          href="mailto:support@bodytracker.app"
          className="text-foreground font-medium hover:underline"
        >
          support@bodytracker.app
        </a>
      </p>
    </BlankLayout>
  );
}
