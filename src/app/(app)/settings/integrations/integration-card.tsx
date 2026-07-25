"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  onToggle: () => void;
}

export function IntegrationCard({
  name,
  description,
  icon,
  connected,
  onToggle,
}: IntegrationCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">{icon}</div>
        {connected && <Badge variant="success">Connected</Badge>}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-foreground text-sm font-semibold">{name}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button
        variant={connected ? "outline" : "secondary"}
        size="sm"
        className="mt-auto w-full"
        onClick={onToggle}
      >
        {connected ? "Disconnect" : "Connect"}
      </Button>
    </Card>
  );
}
