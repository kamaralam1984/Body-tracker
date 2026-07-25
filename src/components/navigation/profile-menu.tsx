"use client";

import { LogOut, Settings, User, CreditCard } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const user = {
  name: "Jordan Rivera",
  email: "jordan@example.com",
};

export function ProfileMenu() {
  return (
    <DropdownMenu
      placement="bottom-end"
      trigger={
        <button
          type="button"
          aria-label="Open profile menu"
          className="flex items-center rounded-full transition-opacity duration-150 hover:opacity-80"
        >
          <Avatar fallback={user.name} size="sm" status="online" />
        </button>
      }
    >
      <DropdownMenuLabel>
        <div className="flex flex-col gap-0.5 tracking-normal normal-case">
          <span className="text-foreground text-sm font-medium">{user.name}</span>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={User} href="/profile">
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem icon={Settings} href="/settings">
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem icon={CreditCard} href="/settings/billing">
        Billing
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={LogOut} destructive>
        Log out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
