"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User, CreditCard } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const displayName = user?.name ?? "Loading…";
  const displayEmail = user?.email ?? "";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <DropdownMenu
      placement="bottom-end"
      trigger={
        <button
          type="button"
          aria-label="Open profile menu"
          className="flex items-center rounded-full transition-opacity duration-150 hover:opacity-80"
        >
          <Avatar fallback={displayName} size="sm" status="online" />
        </button>
      }
    >
      <DropdownMenuLabel>
        <div className="flex flex-col gap-0.5 tracking-normal normal-case">
          <span className="text-foreground text-sm font-medium">{displayName}</span>
          <span className="text-muted-foreground text-xs">{displayEmail}</span>
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
      <DropdownMenuItem icon={LogOut} destructive onSelect={handleLogout}>
        Log out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
