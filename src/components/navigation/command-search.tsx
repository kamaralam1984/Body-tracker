"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  History,
  KeyRound,
  Search,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { primaryNav, secondaryNav } from "@/constants/nav-items";
import { cn } from "@/lib/utils";

/** Admin sub-pages aren't in the main sidebar (they live behind the "Admin" entry's own sub-nav), so they're surfaced here as direct command-palette shortcuts instead. */
const adminQuickLinks = [
  { label: "Admin · Users", href: "/admin/users", icon: Users },
  { label: "Admin · Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Admin · Teams", href: "/admin/teams", icon: UsersRound },
  { label: "Admin · Roles & Permissions", href: "/admin/roles", icon: ShieldCheck },
  { label: "Admin · Logs", href: "/admin/logs", icon: History },
  { label: "Admin · API Keys", href: "/admin/api-keys", icon: KeyRound },
  { label: "Admin · Billing", href: "/admin/billing", icon: CreditCard },
];

const allItems = [...primaryNav, ...secondaryNav]
  .flatMap((section) => section.items)
  .concat(adminQuickLinks);

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEscapeKey(() => setOpen(false), open);
  useLockBodyScroll(open);

  const results = useMemo(
    () => allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  function go(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border bg-surface text-muted-foreground hover:bg-muted flex h-9 w-64 items-center gap-2 rounded-md border px-3 text-sm shadow-xs transition-colors duration-150"
      >
        <Search className="size-4" strokeWidth={1.75} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <Portal>
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] dark:bg-black/60"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="border-border bg-surface-elevated relative z-10 w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
              >
                <div className="border-border-subtle flex items-center gap-2.5 border-b px-4 py-3">
                  <Search className="text-muted-foreground size-4" strokeWidth={1.75} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search pages…"
                    className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex flex-col gap-0.5 p-1.5">
                  {results.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                      No results found.
                    </p>
                  ) : (
                    results.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => go(item.href)}
                        className={cn(
                          "text-foreground hover:bg-muted flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-100",
                        )}
                      >
                        <item.icon className="text-muted-foreground size-4" strokeWidth={1.75} />
                        {item.label}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
