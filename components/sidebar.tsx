"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  Heart,
  Inbox,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { createFolder, renameFolder, deleteFolder } from "@/lib/actions/folder";
import { toast } from "sonner";

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  children: Folder[];
};

const virtualFolders = [
  { id: "all", name: "All Bookmarks", icon: Bookmark },
  { id: "favorites", name: "Favorites", icon: Heart },
  { id: "unsorted", name: "Unsorted", icon: Inbox },
] as const;

export function Sidebar({ folders }: { folders: Folder[] }) {
  const searchParams = useSearchParams();
  const currentFolder = searchParams.get("folder");
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setIsCreating(false);
      setNewFolderName("");
      return;
    }

    try {
      await createFolder(name);
      setNewFolderName("");
      setIsCreating(false);
      router.refresh();
      toast.success(`Folder "${name}" created`);
    } catch {
      toast.error("Failed to create folder");
    }
  }

  return (
    <nav className="flex flex-col gap-1 p-4">
      {virtualFolders.map((item) => {
        const isActive =
          (item.id === "all" && !currentFolder) || currentFolder === item.id;
        return (
          <Link
            key={item.id}
            href={
              item.id === "all"
                ? "/dashboard"
                : `/dashboard?folder=${item.id}`
            }
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-stone-200 text-stone-900"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}

      <div className="mt-4 mb-1 flex items-center justify-between px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-5 w-5 text-stone-400 hover:text-stone-900"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isCreating && (
        <div className="px-3 py-1">
          <Input
            ref={createInputRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewFolderName("");
              }
            }}
            onBlur={handleCreateFolder}
            placeholder="Folder name..."
            className="h-8 text-sm"
          />
        </div>
      )}

      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          currentFolder={currentFolder}
          depth={0}
        />
      ))}

      {folders.length === 0 && !isCreating && (
        <p className="px-3 py-2 text-xs text-stone-400">No folders yet</p>
      )}
    </nav>
  );
}

function FolderItem({
  folder,
  currentFolder,
  depth,
}: {
  folder: Folder;
  currentFolder: string | null;
  depth: number;
}) {
  const isActive = currentFolder === folder.id;
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  async function handleRename() {
    const name = renameName.trim();
    if (!name || name === folder.name) {
      setIsRenaming(false);
      setRenameName(folder.name);
      return;
    }

    try {
      await renameFolder(folder.id, name);
      setIsRenaming(false);
      router.refresh();
      toast.success(`Folder renamed to "${name}"`);
    } catch {
      toast.error("Failed to rename folder");
      setRenameName(folder.name);
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteFolder(folder.id);
      setShowDeleteDialog(false);
      // If currently viewing the deleted folder, navigate to all bookmarks
      if (currentFolder === folder.id) {
        router.push("/dashboard");
      }
      router.refresh();
      toast.success(`Folder "${folder.name}" deleted`);
    } catch {
      toast.error("Failed to delete folder");
    }
  }

  if (isRenaming) {
    return (
      <div className="py-1" style={{ paddingLeft: `${12 + depth * 16}px` }}>
        <Input
          ref={renameInputRef}
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setIsRenaming(false);
              setRenameName(folder.name);
            }
          }}
          onBlur={handleRename}
          className="h-8 text-sm"
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center justify-between rounded-lg pr-1 transition-colors",
          isActive
            ? "bg-stone-200 text-stone-900"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        )}
      >
        <Link
          href={`/dashboard?folder=${folder.id}`}
          className="flex flex-1 items-center gap-3 py-2 text-sm font-medium"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={() => {
                setRenameName(folder.name);
                setIsRenaming(true);
              }}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{folder.name}&quot;?
              {folder.children.length > 0 &&
                " This will also delete all nested folders."}
              {" "}Bookmarks in this folder will be moved to Unsorted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {folder.children?.map((child) => (
        <FolderItem
          key={child.id}
          folder={child}
          currentFolder={currentFolder}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
