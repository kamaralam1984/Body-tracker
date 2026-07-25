"use client";

import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersonalApiKeysQuery, useSettingsStore } from "@/features/settings";
import { CreatePersonalApiKeyDialog } from "@/features/settings/components/create-personal-api-key-dialog";
import { PersonalApiKeyTable } from "@/features/settings/components/personal-api-key-table";

export default function ApiSettingsPage() {
  const { data, isLoading } = usePersonalApiKeysQuery();
  const setCreateApiKeyOpen = useSettingsStore((state) => state.setCreateApiKeyOpen);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Use a personal access token to authenticate scripts and personal tools as you. Tokens
          inherit your permissions, scoped to whatever you select below — treat them like passwords.
        </p>
        <Button onClick={() => setCreateApiKeyOpen(true)}>
          <KeyRound /> Generate new token
        </Button>
      </div>

      <PersonalApiKeyTable keys={data ?? []} loading={isLoading} />

      <CreatePersonalApiKeyDialog />
    </div>
  );
}
