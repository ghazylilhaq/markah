"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import { Loader2 } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { BookmarkListView } from "@/components/bookmark-list-view";
import { TagFilterBar, type TagForFilter } from "@/components/tag-filter-bar";
import { searchBookmarks, getBookmarks } from "@/lib/actions/bookmark";
import type { BookmarkCardData } from "@/components/bookmark-card";
import type { Folder } from "@/components/sidebar";

export function DashboardContent({
  initialBookmarks,
  initialCursor,
  filter,
  userTags,
  folders,
}: {
  initialBookmarks: BookmarkCardData[];
  initialCursor: string | null;
  filter?: string;
  userTags: TagForFilter[];
  folders?: Folder[];
}) {
  const [searchResults, setSearchResults] = useState<BookmarkCardData[] | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkCardData[] | null>(null);
  const [filteredCursor, setFilteredCursor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isInitialMount = useRef(true);

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

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  const handleClearAllTags = useCallback(() => {
    setSelectedTagIds([]);
  }, []);

  // Re-fetch when tag filters change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (selectedTagIds.length === 0) {
      // No tag filters — clear filtered results, go back to defaults
      setFilteredBookmarks(null);
      setFilteredCursor(null);
      // Also re-search if there's an active search query
      if (searchQuery) {
        startTransition(async () => {
          const result = await searchBookmarks(searchQuery, filter, []);
          setSearchResults(result.bookmarks);
        });
      } else {
        setSearchResults(null);
      }
      return;
    }

    startTransition(async () => {
      if (searchQuery) {
        // Active search + tag filters
        const result = await searchBookmarks(searchQuery, filter, selectedTagIds);
        setSearchResults(result.bookmarks);
      } else {
        // Tag filters only (no search query)
        const result = await getBookmarks(undefined, 20, filter, selectedTagIds);
        setFilteredBookmarks(result.bookmarks);
        setFilteredCursor(result.nextCursor);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds]);

  const isSearching = searchResults !== null;
  const hasTagFilters = selectedTagIds.length > 0;
  const showFiltered = !isSearching && hasTagFilters && filteredBookmarks !== null;

  return (
    <div className="space-y-4">
      <SearchBar
        filter={filter}
        tagIds={selectedTagIds}
        onResults={handleResults}
        onClear={handleClear}
      />

      <TagFilterBar
        tags={userTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={handleToggleTag}
        onClearAll={handleClearAllTags}
      />

      {isSearching && (
        <p className="text-sm text-stone-500">
          {searchResults.length === 0
            ? `No results for "${searchQuery}"`
            : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${searchQuery}"`}
        </p>
      )}

      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : isSearching ? (
        <BookmarkListView
          key={`search-${searchQuery}-${selectedTagIds.join(",")}`}
          initialBookmarks={searchResults}
          initialCursor={null}
          filter={filter}
          tagIds={selectedTagIds}
          folders={folders}
        />
      ) : showFiltered ? (
        <BookmarkListView
          key={`tags-${selectedTagIds.join(",")}`}
          initialBookmarks={filteredBookmarks}
          initialCursor={filteredCursor}
          filter={filter}
          tagIds={selectedTagIds}
          folders={folders}
        />
      ) : (
        <BookmarkListView
          key={`default-${initialBookmarks.map(b => b.id).join(",")}-${initialCursor ?? ""}`}
          initialBookmarks={initialBookmarks}
          initialCursor={initialCursor}
          filter={filter}
          folders={folders}
        />
      )}
    </div>
  );
}
