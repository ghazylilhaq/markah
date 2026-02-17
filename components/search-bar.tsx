"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchBookmarks } from "@/lib/actions/bookmark";
import type { BookmarkCardData } from "@/components/bookmark-card";

export function SearchBar({
  filter,
  tagIds,
  onResults,
  onClear,
}: {
  filter?: string;
  tagIds?: string[];
  onResults: (bookmarks: BookmarkCardData[], query: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [searching, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        onClear();
        return;
      }

      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          const result = await searchBookmarks(value, filter, tagIds);
          onResults(result.bookmarks, value);
        });
      }, 300);
    },
    [filter, tagIds, onResults, onClear]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    doSearch(value);
  }

  function handleClear() {
    setQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onClear();
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <Input
        type="text"
        placeholder="Search bookmarks..."
        value={query}
        onChange={handleChange}
        className="pl-9 pr-16"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {searching && (
          <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
        )}
        {query && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            className="h-6 w-6 text-stone-400 hover:text-stone-600"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
