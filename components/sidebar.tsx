"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bookmark, Heart, Inbox, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Folder = {
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

      {folders.length > 0 && (
        <>
          <div className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Folders
          </div>
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              currentFolder={currentFolder}
              depth={0}
            />
          ))}
        </>
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

  return (
    <>
      <Link
        href={`/dashboard?folder=${folder.id}`}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-stone-200 text-stone-900"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <FolderOpen className="h-4 w-4" />
        {folder.name}
      </Link>
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
