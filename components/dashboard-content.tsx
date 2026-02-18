"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { BookmarkListView } from "@/components/bookmark-list-view";
import { TagFilterBar, type TagForFilter } from "@/components/tag-filter-bar";
import { SourceFilterBar } from "@/components/source-filter-bar";
import { searchBookmarks, getBookmarks } from "@/lib/actions/bookmark";
import type { BookmarkCardData } from "@/components/bookmark-card";
import type { Folder } from "@/components/sidebar";

export function DashboardContent({
  initialBookmarks,
  initialCursor,
  filter,
  initialSource,
  userTags,
  folders,
}: {
  initialBookmarks: BookmarkCardData[];
  initialCursor: string | null;
  filter?: string;
  initialSource?: string;
  userTags: TagForFilter[];
  folders?: Folder[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<BookmarkCardData[] | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>(initialSource ?? "all");
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

  const handleSourceChange = useCallback((source: string) => {
    setSelectedSource(source);
    // Update URL param
    const params = new URLSearchParams(searchParams.toString());
    if (source === "all") {
      params.delete("source");
    } else {
      params.set("source", source);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Re-fetch when tag filters or source filter change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const source = selectedSource === "all" ? undefined : selectedSource;

    if (selectedTagIds.length === 0 && !source) {
      // No filters — clear filtered results, go back to defaults
      setFilteredBookmarks(null);
      setFilteredCursor(null);
      if (searchQuery) {
        startTransition(async () => {
          const result = await searchBookmarks(searchQuery, filter, [], undefined);
          setSearchResults(result.bookmarks);
        });
      } else {
        setSearchResults(null);
      }
      return;
    }

    startTransition(async () => {
      if (searchQuery) {
        // Active search + filters
        const result = await searchBookmarks(searchQuery, filter, selectedTagIds, source);
        setSearchResults(result.bookmarks);
      } else {
        // Filters only (no search query)
        const result = await getBookmarks(undefined, 20, filter, selectedTagIds, source);
        setFilteredBookmarks(result.bookmarks);
        setFilteredCursor(result.nextCursor);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds, selectedSource]);

  const isSearching = searchResults !== null;
  const hasTagFilters = selectedTagIds.length > 0;
  const hasSourceFilter = selectedSource !== "all";
  const showFiltered = !isSearching && (hasTagFilters || hasSourceFilter) && filteredBookmarks !== null;

  const source = selectedSource === "all" ? undefined : selectedSource;

  return (
    <div className="space-y-4">
      <SearchBar
        filter={filter}
        tagIds={selectedTagIds}
        source={source}
        onResults={handleResults}
        onClear={handleClear}
      />

      <TagFilterBar
        tags={userTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={handleToggleTag}
        onClearAll={handleClearAllTags}
      />

      <SourceFilterBar
        selectedSource={selectedSource}
        onSourceChange={handleSourceChange}
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
          key={`search-${searchQuery}-${selectedTagIds.join(",")}-${selectedSource}`}
          initialBookmarks={searchResults}
          initialCursor={null}
          filter={filter}
          tagIds={selectedTagIds}
          source={source}
          folders={folders}
        />
      ) : showFiltered ? (
        <BookmarkListView
          key={`filtered-${selectedTagIds.join(",")}-${selectedSource}`}
          initialBookmarks={filteredBookmarks}
          initialCursor={filteredCursor}
          filter={filter}
          tagIds={selectedTagIds}
          source={source}
          folders={folders}
        />
      ) : (
        <BookmarkListView
          key={`default-${initialBookmarks.map(b => b.id).join(",")}-${initialCursor ?? ""}`}
          initialBookmarks={initialBookmarks}
          initialCursor={initialCursor}
          filter={filter}
          source={source}
          folders={folders}
        />
      )}
    </div>
  );
}
