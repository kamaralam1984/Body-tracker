"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { buildSearchIndex, searchDocs } from "../lib/search-index";

const RECENT_LIMIT = 5;

/** Cmd/Ctrl+K docs search — open state, query, ranked results, and a small localStorage-backed recent-searches list. */
export function useDocsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useLocalStorage<string[]>("docs-recent-searches", []);
  const router = useRouter();
  const index = useMemo(() => buildSearchIndex(), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => searchDocs(query, index), [query, index]);

  function go(url: string, title: string) {
    setRecent([title, ...recent.filter((r) => r !== title)].slice(0, RECENT_LIMIT));
    router.push(url);
    setOpen(false);
    setQuery("");
  }

  return { open, setOpen, query, setQuery, results, recent, go };
}
