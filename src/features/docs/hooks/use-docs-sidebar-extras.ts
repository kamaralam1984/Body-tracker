"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

const RECENTLY_VIEWED_LIMIT = 5;

/** Sidebar "Favorites"/"Bookmarks" and "Recently Viewed" — both small localStorage-backed lists of page hrefs, via the shared `useLocalStorage` hook (already handles the SSR/hydration-safe read pattern). */
export function useDocsSidebarExtras() {
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("docs-bookmarks", []);
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage<string[]>("docs-recently-viewed", []);

  const toggleBookmark = useCallback(
    (href: string) => {
      setBookmarks(
        bookmarks.includes(href) ? bookmarks.filter((b) => b !== href) : [...bookmarks, href],
      );
    },
    [bookmarks, setBookmarks],
  );

  const trackView = useCallback(
    (href: string) => {
      setRecentlyViewed(
        [href, ...recentlyViewed.filter((r) => r !== href)].slice(0, RECENTLY_VIEWED_LIMIT),
      );
    },
    [recentlyViewed, setRecentlyViewed],
  );

  return { bookmarks, toggleBookmark, recentlyViewed, trackView };
}
