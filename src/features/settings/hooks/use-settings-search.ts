"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { buildSettingsSearchIndex, searchSettings } from "../lib/settings-search";

const RECENT_LIMIT = 5;

/** Cmd/Ctrl+K settings search — mirrors the docs portal's `useDocsSearch` pattern (same shape, same shared `useLocalStorage` hook for the recent-searches list). */
export function useSettingsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useLocalStorage<string[]>("settings-recent-searches", []);
  const router = useRouter();
  const index = useMemo(() => buildSettingsSearchIndex(), []);

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

  const results = useMemo(() => searchSettings(query, index), [query, index]);

  function go(url: string, title: string) {
    setRecent([title, ...recent.filter((r) => r !== title)].slice(0, RECENT_LIMIT));
    router.push(url);
    setOpen(false);
    setQuery("");
  }

  return { open, setOpen, query, setQuery, results, recent, go };
}
