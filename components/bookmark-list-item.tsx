"use client";

import { useState } from "react";
import { Star, ExternalLink, Pencil, Trash2, Share2, MoreVertical, FolderInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tagBadgeStyle } from "@/lib/utils/tag-color";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleFavorite, recordVisit, deleteBookmark } from "@/lib/actions/bookmark";
import { useRouter } from "next/navigation";
import type { BookmarkCardData } from "@/components/bookmark-card";
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

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
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
    <div className="group flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 transition-shadow hover:shadow-sm">
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
            className="text-xs px-1.5 py-0"
            style={tagBadgeStyle(tag.name)}
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

      {/* Favorite */}
      <button
        onClick={handleToggleFavorite}
        disabled={toggling}
        className="shrink-0 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-0.5 flex items-center justify-center text-stone-400 transition-colors hover:text-amber-500"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={cn(
            "h-4 w-4",
            isFavorite && "fill-amber-400 text-amber-400"
          )}
        />
      </button>

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
