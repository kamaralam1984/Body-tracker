"use client";

/**
 * Sticky top navigation for the docs portal. "Profile menu" and "language
 * switcher" from the original brief are deliberately omitted here — this is
 * a public SDK documentation site (like docs.stripe.com), not an
 * authenticated dashboard; there's no doc-reader identity/profile concept
 * anywhere in this app to hang a profile menu off of, and no multi-language
 * content exists to switch between. Everything else — search, version,
 * theme, GitHub, live status — is real.
 */

import Link from "next/link";
import { ChevronDown, GitBranch, Menu, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { SDK_GITHUB_URL, SDK_VERSION } from "../lib/docs-nav";
import { DocsSearchTrigger } from "./docs-search-dialog";

const VERSIONS = [
  { value: "3.4.0", label: "v3.4.0", current: true },
  { value: "3.3.0", label: "v3.3.0 (older)", current: false },
  { value: "2.x", label: "v2.x (legacy)", current: false },
];

export function DocsHeader({
  onSearchOpen,
  onMenuToggle,
  className,
}: {
  onSearchOpen: () => void;
  onMenuToggle?: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-border bg-surface/90 sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      {onMenuToggle && (
        <button
          type="button"
          onClick={onMenuToggle}
          className="text-muted-foreground hover:text-foreground -ml-1 flex size-8 items-center justify-center rounded-md lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
      )}

      <Link href="/docs" className="flex shrink-0 items-center gap-2.5">
        <span className="bg-foreground text-background flex size-7 items-center justify-center rounded-md text-sm font-bold">
          BT
        </span>
        <span className="text-foreground hidden text-sm font-semibold sm:inline">
          Body Tracker Docs
        </span>
      </Link>

      <DropdownMenu
        placement="bottom-start"
        trigger={
          <button
            type="button"
            className="border-border bg-surface text-muted-foreground hover:text-foreground hidden shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium sm:flex"
          >
            v{SDK_VERSION}
            <ChevronDown className="size-3" strokeWidth={2} />
          </button>
        }
      >
        {VERSIONS.map((v) => (
          <DropdownMenuItem key={v.value} disabled={!v.current}>
            {v.label}
            {v.current && (
              <Badge variant="accent" className="ml-2 text-[10px]">
                Current
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>

      <div className="flex-1" />

      <DocsSearchTrigger onOpen={onSearchOpen} className="max-w-64" />

      <Link
        href="/docs/status"
        className="border-border bg-surface hover:bg-muted hidden shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium md:flex"
      >
        <ShieldCheck className="text-success-500 size-3.5" strokeWidth={2} />
        <span className="relative flex size-1.5">
          <span className="bg-success-500 absolute inline-flex size-full animate-ping rounded-full opacity-75" />
          <span className="bg-success-500 relative inline-flex size-1.5 rounded-full" />
        </span>
        All systems operational
      </Link>

      <a
        href={SDK_GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="View on GitHub"
        className="text-muted-foreground hover:text-foreground hidden size-8 shrink-0 items-center justify-center rounded-md sm:flex"
      >
        <GitBranch className="size-4" strokeWidth={1.75} />
      </a>

      <ThemeToggle className="shrink-0" />

      <Button variant="primary" size="sm" className="hidden shrink-0 lg:inline-flex" asChild>
        <Link href="/dashboard">Go to app</Link>
      </Button>
    </header>
  );
}
