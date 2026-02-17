"use client";

import { useState } from "react";
import { Check, Folder, Inbox } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { moveBookmarkToFolder, removeBookmarkFromAllFolders, getBookmarkDetails } from "@/lib/actions/bookmark";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Folder as FolderType } from "@/components/sidebar";

export function MoveToFolderDialog({
  bookmarkId,
  folders,
  open,
  onOpenChange,
}: {
  bookmarkId: string;
  folders: FolderType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentFolderIds, setCurrentFolderIds] = useState<string[] | null>(null);
  const [moving, setMoving] = useState(false);
  const router = useRouter();

  async function loadCurrentFolders() {
    const details = await getBookmarkDetails(bookmarkId);
    if (details) {
      setCurrentFolderIds(details.folderIds);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setCurrentFolderIds(null);
      loadCurrentFolders();
    }
    onOpenChange(nextOpen);
  }

  async function handleMoveToFolder(folderId: string, folderName: string) {
    if (moving) return;
    setMoving(true);
    try {
      await moveBookmarkToFolder(bookmarkId, folderId);
      toast.success(`Moved to ${folderName}`);
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error("Failed to move bookmark");
    } finally {
      setMoving(false);
    }
  }

  async function handleMoveToUnsorted() {
    if (moving) return;
    setMoving(true);
    try {
      await removeBookmarkFromAllFolders(bookmarkId);
      toast.success("Moved to Unsorted");
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error("Failed to move bookmark");
    } finally {
      setMoving(false);
    }
  }

  const isInFolder = (folderId: string) => currentFolderIds?.includes(folderId) ?? false;
  const isUnsorted = currentFolderIds !== null && currentFolderIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60dvh]">
          {/* Unsorted option */}
          <button
            onClick={handleMoveToUnsorted}
            disabled={moving}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 min-h-[44px] text-sm text-stone-700 hover:bg-stone-100 transition-colors",
              isUnsorted && "bg-stone-50 font-medium"
            )}
          >
            <Inbox className="h-4 w-4 shrink-0 text-stone-400" />
            <span className="flex-1 text-left">Unsorted</span>
            {isUnsorted && <Check className="h-4 w-4 shrink-0 text-stone-600" />}
          </button>

          {/* Folder tree */}
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              depth={0}
              isInFolder={isInFolder}
              onSelect={handleMoveToFolder}
              disabled={moving}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FolderRow({
  folder,
  depth,
  isInFolder,
  onSelect,
  disabled,
}: {
  folder: FolderType;
  depth: number;
  isInFolder: (id: string) => boolean;
  onSelect: (id: string, name: string) => void;
  disabled: boolean;
}) {
  const active = isInFolder(folder.id);

  return (
    <>
      <button
        onClick={() => onSelect(folder.id, folder.name)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 min-h-[44px] text-sm text-stone-700 hover:bg-stone-100 transition-colors",
          active && "bg-stone-50 font-medium"
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <Folder className="h-4 w-4 shrink-0 text-stone-400" />
        <span className="flex-1 text-left truncate">{folder.name}</span>
        {active && <Check className="h-4 w-4 shrink-0 text-stone-600" />}
      </button>
      {folder.children.map((child) => (
        <FolderRow
          key={child.id}
          folder={child}
          depth={depth + 1}
          isInFolder={isInFolder}
          onSelect={onSelect}
          disabled={disabled}
        />
      ))}
    </>
  );
}
