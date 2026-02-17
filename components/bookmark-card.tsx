"use client";

import { useState } from "react";
import { Star, ExternalLink, Pencil, Trash2, Share2, MoreVertical, FolderInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleFavorite, recordVisit, deleteBookmark } from "@/lib/actions/bookmark";
import { useRouter } from "next/navigation";
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShareDialog } from "@/components/share-dialog";
import { MoveToFolderDialog } from "@/components/move-to-folder-dialog";
import type { Folder } from "@/components/sidebar";

type Tag = {
  id: string;
  name: string;
  color: string | null;
};

export type BookmarkCardData = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  isFavorite: boolean;
  visitCount: number;
  lastVisitedAt: string | null;
  createdAt: string;
  tags: Tag[];
};

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

function domainToColor(domain: string): string {
  const h = hashCode(domain) % 360;
  return `hsl(${h}, 40%, 85%)`;
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

export function BookmarkCard({
  bookmark,
  onDelete,
  folders,
}: {
  bookmark: BookmarkCardData;
  onDelete?: (id: string) => void;
  folders?: Folder[];
}) {
  const [isFavorite, setIsFavorite] = useState(bookmark.isFavorite);
  const [toggling, setToggling] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    <div className="group overflow-hidden rounded-lg border border-stone-200 bg-white transition-shadow hover:shadow-md">
      {/* Thumbnail / Color card */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleVisit}
        className="relative block h-40 overflow-hidden"
      >
        {bookmark.image ? (
          <img
            src={bookmark.image}
            alt={bookmark.title || ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: domainToColor(domain) }}
          >
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt=""
                className="h-10 w-10"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <ExternalLink className="h-8 w-8 text-stone-400" />
            )}
          </div>
        )}
      </a>

      {/* Card body */}
      <div className="p-3">
        {/* Title + Favorite */}
        <div className="flex items-start gap-2">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleVisit}
            className="min-w-0 flex-1"
          >
            <h3 className="truncate text-sm font-semibold text-stone-900 hover:underline">
              {bookmark.title || bookmark.url}
            </h3>
          </a>
          {/* Mobile overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-600 md:hidden"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="min-h-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveOpen(true);
                }}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-[44px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareOpen(true);
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-[44px] text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Desktop hover-reveal buttons */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShareOpen(true);
            }}
            className="hidden shrink-0 p-0.5 text-stone-400 opacity-0 transition-all hover:text-stone-600 group-hover:opacity-100 md:inline-flex"
            aria-label="Share bookmark"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditOpen(true);
            }}
            className="hidden shrink-0 p-0.5 text-stone-400 opacity-0 transition-all hover:text-stone-600 group-hover:opacity-100 md:inline-flex"
            aria-label="Edit bookmark"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="hidden shrink-0 p-0.5 text-stone-400 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 md:inline-flex"
            aria-label="Delete bookmark"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this bookmark?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{bookmark.title || bookmark.url}&quot; and remove all its tag and folder associations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await deleteBookmark(bookmark.id);
                      onDelete?.(bookmark.id);
                      toast.success("Bookmark deleted");
                      router.refresh();
                    } catch {
                      toast.error("Failed to delete bookmark");
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

        {/* Description */}
        {bookmark.description && (
          <p className="mt-1 line-clamp-2 text-xs text-stone-500">
            {bookmark.description}
          </p>
        )}

        {/* Domain + Date */}
        <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
          {bookmark.favicon && (
            <img
              src={bookmark.favicon}
              alt=""
              className="h-3.5 w-3.5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className="truncate">{domain}</span>
          <span className="text-stone-300">·</span>
          <span className="shrink-0">{formatDate(bookmark.createdAt)}</span>
          {bookmark.visitCount > 0 && (
            <>
              <span className="text-stone-300">·</span>
              <span className="shrink-0">
                {bookmark.visitCount} {bookmark.visitCount === 1 ? "visit" : "visits"}
              </span>
            </>
          )}
          {bookmark.lastVisitedAt && (
            <>
              <span className="text-stone-300">·</span>
              <span className="shrink-0">{formatRelativeTime(bookmark.lastVisitedAt)}</span>
            </>
          )}
        </div>

        {/* Tags */}
        {bookmark.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {bookmark.tags.map((tag) => (
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
          </div>
        )}
      </div>

      <EditBookmarkDialog
        bookmarkId={bookmark.id}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        type="bookmark"
        id={bookmark.id}
        name={bookmark.title || bookmark.url}
      />

      {folders && (
        <MoveToFolderDialog
          bookmarkId={bookmark.id}
          folders={folders}
          open={moveOpen}
          onOpenChange={setMoveOpen}
        />
      )}
    </div>
  );
}
