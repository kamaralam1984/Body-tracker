"use client";

import { Switch } from "@/components/ui/switch";

interface ToggleDefinition {
  id: string;
  label: string;
  description: string;
}

interface NotificationToggleListProps {
  items: ToggleDefinition[];
  checked: Record<string, boolean>;
  onCheckedChange: (id: string, checked: boolean) => void;
}

export function NotificationToggleList({
  items,
  checked,
  onCheckedChange,
}: NotificationToggleListProps) {
  return (
    <div className="divide-border-subtle flex flex-col divide-y">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
        >
          <div className="flex flex-col gap-0.5">
            <label htmlFor={item.id} className="text-foreground text-sm font-medium">
              {item.label}
            </label>
            <p className="text-muted-foreground text-xs">{item.description}</p>
          </div>
          <Switch
            id={item.id}
            checked={checked[item.id] ?? false}
            onCheckedChange={(next) => onCheckedChange(item.id, next)}
          />
        </div>
      ))}
    </div>
  );
}
