"use client";

/**
 * The docs portal shell: sticky header, a fixed left sidebar on desktop
 * (slide-over drawer on mobile/tablet), and the page content. Individual
 * pages render their own right-rail `TableOfContents` inline (next to their
 * content) rather than this shell owning a global TOC slot, since only some
 * pages have enough headings to need one.
 *
 * Mounted once by `src/app/docs/layout.tsx`.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocsHeader } from "./docs-header";
import { DocsSidebar } from "./docs-sidebar";
import { DocsSearchDialog } from "./docs-search-dialog";
import { useDocsSearch } from "../hooks/use-docs-search";
import { useDocsSidebarExtras } from "../hooks/use-docs-sidebar-extras";

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const search = useDocsSearch();
  const { trackView } = useDocsSidebarExtras();

  // Close the mobile nav on route change. Adjusting state during render
  // (guarded against the previous-render pathname) instead of in an effect
  // avoids an extra cascading render pass.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileNavOpen(false);
  }

  useEffect(() => {
    trackView(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only track on route change, not when trackView identity changes
  }, [pathname]);

  return (
    <div className="bg-background min-h-screen">
      <DocsHeader
        onSearchOpen={() => search.setOpen(true)}
        onMenuToggle={() => setMobileNavOpen(true)}
      />

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto px-4 py-8 lg:block">
          <DocsSidebar />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">{children}</main>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-[1px] lg:hidden dark:bg-black/60"
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "border-border bg-surface fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r px-4 py-6 lg:hidden",
              )}
            >
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="text-muted-foreground hover:text-foreground mb-4 flex size-8 items-center justify-center rounded-md"
                aria-label="Close navigation"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
              <DocsSidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DocsSearchDialog search={search} />
    </div>
  );
}
