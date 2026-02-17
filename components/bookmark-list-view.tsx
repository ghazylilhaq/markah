"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookmarkCard, type BookmarkCardData } from "@/components/bookmark-card";
import { BookmarkListItem } from "@/components/bookmark-list-item";
import { getBookmarks } from "@/lib/actions/bookmark";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

const STORAGE_KEY = "markah-view-mode";

function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    () => (localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "grid") as ViewMode,
    () => "grid" as ViewMode
  );

  function setMode(next: ViewMode) {
    localStorage.setItem(STORAGE_KEY, next);
    // Trigger re-render by dispatching a storage event
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }

  return [mode, setMode];
}

export function BookmarkListView({
  initialBookmarks,
  initialCursor,
}: {
  initialBookmarks: BookmarkCardData[];
  initialCursor: string | null;
}) {
  const [viewMode, setViewMode] = useViewMode();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, startTransition] = useTransition();

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await getBookmarks(cursor);
      setBookmarks((prev) => [...prev, ...result.bookmarks]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewMode("grid")}
          className={cn(
            "text-stone-400",
            viewMode === "grid" && "bg-stone-100 text-stone-900"
          )}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewMode("list")}
          className={cn(
            "text-stone-400",
            viewMode === "list" && "bg-stone-100 text-stone-900"
          )}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Bookmarks */}
      {bookmarks.length === 0 ? (
        <p className="text-sm text-stone-500">No bookmarks yet.</p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <BookmarkCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <BookmarkListItem key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      )}

      {/* Load more */}
      {cursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loading}
            className="text-stone-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
