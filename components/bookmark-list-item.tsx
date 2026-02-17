"use client";

import { useState } from "react";
import { Star, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toggleFavorite, recordVisit } from "@/lib/actions/bookmark";
import { useRouter } from "next/navigation";
import type { BookmarkCardData } from "@/components/bookmark-card";

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function tagToColor(tagName: string): string {
  const h = hashCode(tagName) % 360;
  return `hsl(${h}, 55%, 50%)`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function BookmarkListItem({
  bookmark,
}: {
  bookmark: BookmarkCardData;
}) {
  const [isFavorite, setIsFavorite] = useState(bookmark.isFavorite);
  const [toggling, setToggling] = useState(false);
  const router = useRouter();
  const domain = getDomain(bookmark.url);

  function handleVisit() {
    recordVisit(bookmark.id).catch(() => {});
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;

    setToggling(true);
    const prev = isFavorite;
    setIsFavorite(!prev);

    try {
      await toggleFavorite(bookmark.id);
      router.refresh();
    } catch {
      setIsFavorite(prev);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 transition-shadow hover:shadow-sm">
      {/* Favicon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-stone-100">
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="h-4 w-4"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <ExternalLink className="h-4 w-4 text-stone-400" />
        )}
      </div>

      {/* Title */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleVisit}
        className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900 hover:underline"
      >
        {bookmark.title || bookmark.url}
      </a>

      {/* Domain */}
      <span className="hidden shrink-0 text-xs text-stone-400 sm:inline">
        {domain}
      </span>

      {/* Tags */}
      <div className="hidden items-center gap-1 md:flex">
        {bookmark.tags.slice(0, 3).map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
            style={{
              backgroundColor: `${tagToColor(tag.name)}20`,
              color: tagToColor(tag.name),
              borderColor: `${tagToColor(tag.name)}40`,
              borderWidth: "1px",
            }}
          >
            {tag.name}
          </Badge>
        ))}
        {bookmark.tags.length > 3 && (
          <span className="text-[10px] text-stone-400">
            +{bookmark.tags.length - 3}
          </span>
        )}
      </div>

      {/* Visit info */}
      {bookmark.visitCount > 0 && (
        <span className="hidden shrink-0 text-xs text-stone-400 lg:inline">
          {bookmark.visitCount} {bookmark.visitCount === 1 ? "visit" : "visits"}
          {bookmark.lastVisitedAt && ` · ${formatRelativeTime(bookmark.lastVisitedAt)}`}
        </span>
      )}

      {/* Date */}
      <span className="hidden shrink-0 text-xs text-stone-400 lg:inline">
        {formatDate(bookmark.createdAt)}
      </span>

      {/* Favorite */}
      <button
        onClick={handleToggleFavorite}
        disabled={toggling}
        className="shrink-0 p-0.5 text-stone-400 transition-colors hover:text-amber-500"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={cn(
            "h-4 w-4",
            isFavorite && "fill-amber-400 text-amber-400"
          )}
        />
      </button>
    </div>
  );
}
