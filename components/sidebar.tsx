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
  ChevronRight,
  FolderPlus,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
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
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  function startCreating(parentId?: string) {
    setCreatingParentId(parentId ?? null);
    setIsCreating(true);
    setNewFolderName("");
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setIsCreating(false);
      setNewFolderName("");
      setCreatingParentId(null);
      return;
    }

    try {
      await createFolder(name, creatingParentId ?? undefined);
      setNewFolderName("");
      setIsCreating(false);
      setCreatingParentId(null);
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
          onClick={() => startCreating()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isCreating && creatingParentId === null && (
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
          isCreating={isCreating}
          creatingParentId={creatingParentId}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          createInputRef={createInputRef}
          onCreateFolder={handleCreateFolder}
          onCancelCreate={() => {
            setIsCreating(false);
            setNewFolderName("");
            setCreatingParentId(null);
          }}
          onStartCreateSubfolder={startCreating}
        />
      ))}

      {folders.length === 0 && !isCreating && (
        <p className="px-3 py-2 text-xs text-stone-400">No folders yet</p>
      )}
    </nav>
  );
}

const MAX_FOLDER_DEPTH = 3; // root(1) > child(2) > grandchild(3)

function FolderItem({
  folder,
  currentFolder,
  depth,
  isCreating,
  creatingParentId,
  newFolderName,
  setNewFolderName,
  createInputRef,
  onCreateFolder,
  onCancelCreate,
  onStartCreateSubfolder,
}: {
  folder: Folder;
  currentFolder: string | null;
  depth: number;
  isCreating: boolean;
  creatingParentId: string | null;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  createInputRef: React.RefObject<HTMLInputElement | null>;
  onCreateFolder: () => void;
  onCancelCreate: () => void;
  onStartCreateSubfolder: (parentId: string) => void;
}) {
  const isActive = currentFolder === folder.id;
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const hasChildren = folder.children.length > 0;
  const showCreateInput = isCreating && creatingParentId === folder.id;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folderId: folder.id, folderName: folder.name },
  });

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

  function handleCreateSubfolder() {
    // depth is 0-indexed: 0 = root, 1 = child, 2 = grandchild
    // Max depth is 3 levels, so folders at depth 2 cannot have children
    if (depth + 1 >= MAX_FOLDER_DEPTH) {
      toast.error("Maximum folder nesting depth (3 levels) reached");
      return;
    }
    setIsExpanded(true);
    onStartCreateSubfolder(folder.id);
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
        ref={setDropRef}
        className={cn(
          "group flex items-center justify-between rounded-lg pr-1 transition-colors",
          isOver
            ? "bg-blue-100 ring-2 ring-blue-400 text-blue-900"
            : isActive
              ? "bg-stone-200 text-stone-900"
              : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        )}
      >
        <div className="flex flex-1 items-center min-w-0">
          {/* Expand/collapse toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (hasChildren) setIsExpanded(!isExpanded);
            }}
            className={cn(
              "flex shrink-0 items-center justify-center h-6 w-5 ml-1",
              hasChildren ? "text-stone-400 hover:text-stone-700" : "invisible"
            )}
            style={{ marginLeft: `${4 + depth * 16}px` }}
            tabIndex={-1}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>

          <Link
            href={`/dashboard?folder=${folder.id}`}
            className="flex flex-1 items-center gap-2 py-2 pr-1 text-sm font-medium min-w-0"
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{folder.name}</span>
          </Link>
        </div>

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
          <DropdownMenuContent align="end" className="w-44">
            {depth + 1 < MAX_FOLDER_DEPTH && (
              <DropdownMenuItem onClick={handleCreateSubfolder}>
                <FolderPlus className="mr-2 h-3.5 w-3.5" />
                New subfolder
              </DropdownMenuItem>
            )}
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

      {isExpanded && (
        <>
          {showCreateInput && (
            <div className="py-1" style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}>
              <Input
                ref={createInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateFolder();
                  if (e.key === "Escape") onCancelCreate();
                }}
                onBlur={onCreateFolder}
                placeholder="Subfolder name..."
                className="h-8 text-sm"
              />
            </div>
          )}
          {folder.children?.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              currentFolder={currentFolder}
              depth={depth + 1}
              isCreating={isCreating}
              creatingParentId={creatingParentId}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              createInputRef={createInputRef}
              onCreateFolder={onCreateFolder}
              onCancelCreate={onCancelCreate}
              onStartCreateSubfolder={onStartCreateSubfolder}
            />
          ))}
        </>
      )}
    </>
  );
}
