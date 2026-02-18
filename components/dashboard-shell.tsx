"use client";

import { useState, useCallback, Suspense } from "react";
import { signOut } from "next-auth/react";
import { Menu, LogOut, Bookmark, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar, type Folder } from "@/components/sidebar";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { addBookmarkToFolder } from "@/lib/actions/bookmark";
import {
  moveFolderToParent,
  reorderFolders,
} from "@/lib/actions/folder";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BookmarkCardData } from "@/components/bookmark-card";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

type User = {
  id: string;
  email: string | null;
  name: string | null;
};

export function DashboardShell({
  user,
  folders,
  children,
}: {
  user: User;
  folders: Folder[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<BookmarkCardData | null>(null);
  const [activeFolderDrag, setActiveFolderDrag] = useState<{
    id: string;
    name: string;
    parentId: string | null;
  } | null>(null);
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const desktopSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const noSensors = useSensors();

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "bookmark") {
      setActiveDrag(active.data.current.bookmark as BookmarkCardData);
    } else if (active.data.current?.type === "folder-drag") {
      setActiveFolderDrag(
        active.data.current.folder as {
          id: string;
          name: string;
          parentId: string | null;
        }
      );
    }
  }, []);

  // Collect sibling folder IDs at a given parent level from the folder tree
  const getSiblingIds = useCallback(
    (parentId: string | null): string[] => {
      if (parentId === null) {
        return folders.map((f) => f.id);
      }
      function findChildren(nodes: Folder[]): string[] | null {
        for (const node of nodes) {
          if (node.id === parentId) {
            return node.children.map((c) => c.id);
          }
          const found = findChildren(node.children);
          if (found) return found;
        }
        return null;
      }
      return findChildren(folders) ?? [];
    },
    [folders]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const wasFolderDrag = !!activeFolderDrag;
      setActiveDrag(null);
      setActiveFolderDrag(null);
      const { active, over } = event;

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // Bookmark dropped on folder
      if (
        activeData?.type === "bookmark" &&
        overData?.type === "folder"
      ) {
        const bookmarkId = (activeData.bookmark as BookmarkCardData).id;
        const folderId = overData.folderId as string;
        const folderName = overData.folderName as string;

        try {
          const result = await addBookmarkToFolder(bookmarkId, folderId);
          if (result.alreadyInFolder) {
            toast.info("Bookmark is already in this folder");
          } else {
            toast.success(`Moved to "${folderName}"`);
            router.refresh();
          }
        } catch {
          toast.error("Failed to move bookmark to folder");
        }
        return;
      }

      // Folder dropped on another folder (nesting)
      if (wasFolderDrag && overData?.type === "folder") {
        const draggedFolderId = (
          activeData?.folder as { id: string }
        ).id;
        const targetFolderId = overData.folderId as string;
        const targetFolderName = overData.folderName as string;

        if (draggedFolderId === targetFolderId) return;

        try {
          await moveFolderToParent(draggedFolderId, targetFolderId);
          toast.success(`Moved into "${targetFolderName}"`);
          router.refresh();
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to move folder";
          toast.error(msg);
        }
        return;
      }

      // Folder dropped on a gap (reordering)
      if (wasFolderDrag && overData?.type === "folder-gap") {
        const draggedFolder = activeData?.folder as {
          id: string;
          parentId: string | null;
        };
        const targetParentId = overData.parentId as string | null;
        const targetIndex = overData.index as number;

        // If parent changes, it's a move + reorder
        if (draggedFolder.parentId !== targetParentId) {
          // Server enforces depth constraint
          try {
            await moveFolderToParent(draggedFolder.id, targetParentId);
            // Now reorder at the new parent
            const siblings = getSiblingIds(targetParentId).filter(
              (id) => id !== draggedFolder.id
            );
            siblings.splice(targetIndex, 0, draggedFolder.id);
            await reorderFolders(siblings);
            router.refresh();
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : "Failed to move folder";
            toast.error(msg);
            router.refresh();
          }
        } else {
          // Same parent, just reorder
          const siblings = getSiblingIds(targetParentId);
          const currentIndex = siblings.indexOf(draggedFolder.id);
          if (currentIndex === -1) return;

          // Remove from current position and insert at target
          const newOrder = siblings.filter((id) => id !== draggedFolder.id);
          const insertAt =
            targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
          newOrder.splice(insertAt, 0, draggedFolder.id);

          try {
            await reorderFolders(newOrder);
            router.refresh();
          } catch {
            toast.error("Failed to reorder folders");
          }
        }
        return;
      }
    },
    [router, activeFolderDrag, getSiblingIds]
  );

  return (
    <DndContext
      id="markah-dnd"
      sensors={isDesktop ? desktopSensors : noSensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-stone-50">
        {/* Desktop sidebar */}
        <aside className="hidden w-[250px] shrink-0 border-r border-stone-200 bg-white md:block">
          <div className="flex h-14 items-center gap-2 border-b border-stone-200 px-4">
            <Bookmark className="h-5 w-5 text-stone-900" />
            <span className="text-sm font-semibold text-stone-900">Markah</span>
          </div>
          <div className="overflow-y-auto" style={{ height: "calc(100vh - 3.5rem)" }}>
            <Suspense>
              <Sidebar folders={folders} />
            </Suspense>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[250px] p-0">
                  <SheetTitle className="flex h-14 items-center gap-2 border-b border-stone-200 px-4">
                    <Bookmark className="h-5 w-5 text-stone-900" />
                    <span className="text-sm font-semibold text-stone-900">
                      Markah
                    </span>
                  </SheetTitle>
                  <div className="overflow-y-auto max-h-[calc(100dvh-4rem)]">
                    <Suspense>
                      <Sidebar folders={folders} onNavigate={() => setOpen(false)} />
                    </Suspense>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2 md:hidden">
                <Bookmark className="h-5 w-5 text-stone-900" />
                <span className="text-sm font-semibold text-stone-900">
                  Markah
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-stone-500 sm:inline">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ redirectTo: "/" })}
                className="text-stone-600"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-3 md:p-6">{children}</main>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div className="w-64 rounded-lg border border-stone-300 bg-white p-3 shadow-lg opacity-90">
            <p className="truncate text-sm font-medium text-stone-900">
              {activeDrag.title || activeDrag.url}
            </p>
            <p className="truncate text-xs text-stone-500">
              {activeDrag.url}
            </p>
          </div>
        )}
        {activeFolderDrag && (
          <div className="w-48 rounded-lg border border-stone-300 bg-white p-2 shadow-lg opacity-90 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-stone-600 shrink-0" />
            <p className="truncate text-sm font-medium text-stone-900">
              {activeFolderDrag.name}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
