"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export function SecurityMfaToggle() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor="mfa-toggle" className="text-foreground text-sm font-medium">
          Require an authenticator app
        </label>
        <p className="text-muted-foreground text-xs">
          Adds a second verification step when signing in.
        </p>
      </div>
      <Switch id="mfa-toggle" checked={enabled} onCheckedChange={setEnabled} />
    </div>
  );
}
