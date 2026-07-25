"use client";

/**
 * Cmd/Ctrl+K search for the settings center. Same visual/animation
 * technique as the docs portal's search dialog
 * (`src/features/docs/components/docs-search-dialog.tsx`) — Portal +
 * backdrop + centered panel — adapted for `SettingsSearchEntry`.
 */

import { Search, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";
import type { useSettingsSearch } from "../hooks/use-settings-search";

export function SettingsSearchTrigger({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "border-border bg-surface text-muted-foreground hover:bg-muted flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm shadow-xs transition-colors duration-150 sm:w-64",
        className,
      )}
    >
      <Search className="size-4" strokeWidth={1.75} />
      <span className="flex-1 text-left">Search settings…</span>
      <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}

/** Takes the caller's single `useSettingsSearch()` instance as a prop — sharing one state instance with whatever renders `SettingsSearchTrigger` is required, or opening from the trigger wouldn't open this dialog. */
export function SettingsSearchDialog({ search }: { search: ReturnType<typeof useSettingsSearch> }) {
  const { open, setOpen, query, setQuery, results, recent, go } = search;
  useEscapeKey(() => setOpen(false), open);
  useLockBodyScroll(open);

  return (
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
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search settings…"
                  className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
                />
                <kbd className="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                  Esc
                </kbd>
              </div>

              <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto p-1.5">
                {query.trim() === "" ? (
                  recent.length > 0 ? (
                    <>
                      <p className="text-muted-foreground px-3 pt-2 pb-1 text-xs font-medium">
                        Recent searches
                      </p>
                      {recent.map((term) => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          className="text-foreground hover:bg-muted flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-100"
                        >
                          <Clock className="text-muted-foreground size-3.5" strokeWidth={1.75} />
                          {term}
                        </button>
                      ))}
                    </>
                  ) : (
                    <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                      Search for any setting, field, or action.
                    </p>
                  )
                ) : results.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                    No results found.
                  </p>
                ) : (
                  results.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => go(entry.url, entry.title)}
                      className="hover:bg-muted flex flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-100"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">{entry.title}</span>
                        <span className="text-muted-foreground text-xs">{entry.section}</span>
                      </span>
                      {entry.description && (
                        <span className="text-muted-foreground line-clamp-1 text-xs">
                          {entry.description}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
