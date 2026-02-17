import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { QuickAddWithSuggestions } from "@/components/quick-add-with-suggestions";
import { DashboardContent } from "@/components/dashboard-content";
import { getBookmarks, getUserTags } from "@/lib/actions/bookmark";
import { prisma } from "@/lib/prisma";

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

  const [{ bookmarks, nextCursor }, userTags] = await Promise.all([
    getBookmarks(undefined, 20, filter),
    getUserTags(),
  ]);

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
      />
    </div>
  );
}
