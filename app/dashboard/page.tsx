import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { QuickAddWithSuggestions } from "@/components/quick-add-with-suggestions";
import { DashboardContent } from "@/components/dashboard-content";
import { getBookmarks, getUserTags } from "@/lib/actions/bookmark";
import { prisma } from "@/lib/prisma";
import type { Folder } from "@/components/sidebar";

function buildFolderTree(
  folders: { id: string; name: string; parentId: string | null; position: number }[]
): Folder[] {
  const map = new Map<string, Folder>();
  const roots: Folder[] = [];

  for (const f of folders) {
    map.set(f.id, { id: f.id, name: f.name, parentId: f.parentId, position: f.position, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function getFilterLabel(
  filter: string | undefined,
  folderName: string | null
): string {
  if (!filter || filter === "all") return "All Bookmarks";
  if (filter === "favorites") return "Favorites";
  if (filter === "unsorted") return "Unsorted";
  return folderName ?? "Bookmarks";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { folder: filter } = await searchParams;

  // If filtering by a specific folder, look up its name for the heading
  let folderName: string | null = null;
  if (filter && !["all", "favorites", "unsorted"].includes(filter)) {
    const folder = await prisma.folder.findFirst({
      where: { id: filter, userId: user.id },
      select: { name: true },
    });
    folderName = folder?.name ?? null;
  }

  const [{ bookmarks, nextCursor }, userTags, allFolders] = await Promise.all([
    getBookmarks(undefined, 20, filter),
    getUserTags(),
    prisma.folder.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, parentId: true, position: true },
      orderBy: { position: "asc" },
    }),
  ]);

  const folderTree = buildFolderTree(allFolders);

  const heading = getFilterLabel(filter, folderName);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{heading}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {bookmarks.length === 0
            ? filter === "favorites"
              ? "No favorite bookmarks yet."
              : filter === "unsorted"
                ? "No unsorted bookmarks."
                : "Your bookmarks will appear here."
            : `${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <QuickAddWithSuggestions />

      <DashboardContent
        initialBookmarks={bookmarks}
        initialCursor={nextCursor}
        filter={filter}
        userTags={userTags}
        folders={folderTree}
      />
    </div>
  );
}
