"use client";

import { useState, useCallback } from "react";
import { SearchBar } from "@/components/search-bar";
import { BookmarkListView } from "@/components/bookmark-list-view";
import type { BookmarkCardData } from "@/components/bookmark-card";

export function DashboardContent({
  initialBookmarks,
  initialCursor,
  filter,
}: {
  initialBookmarks: BookmarkCardData[];
  initialCursor: string | null;
  filter?: string;
}) {
  const [searchResults, setSearchResults] = useState<BookmarkCardData[] | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleResults = useCallback(
    (bookmarks: BookmarkCardData[], query: string) => {
      setSearchResults(bookmarks);
      setSearchQuery(query);
    },
    []
  );

  const handleClear = useCallback(() => {
    setSearchResults(null);
    setSearchQuery("");
  }, []);

  const isSearching = searchResults !== null;

  return (
    <div className="space-y-4">
      <SearchBar filter={filter} onResults={handleResults} onClear={handleClear} />

      {isSearching && (
        <p className="text-sm text-stone-500">
          {searchResults.length === 0
            ? `No results for "${searchQuery}"`
            : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${searchQuery}"`}
        </p>
      )}

      {isSearching ? (
        <BookmarkListView
          key={`search-${searchQuery}`}
          initialBookmarks={searchResults}
          initialCursor={null}
          filter={filter}
        />
      ) : (
        <BookmarkListView
          key="default"
          initialBookmarks={initialBookmarks}
          initialCursor={initialCursor}
          filter={filter}
        />
      )}
    </div>
  );
}
