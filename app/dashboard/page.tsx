import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { QuickAddBar } from "@/components/quick-add-bar";
import { BookmarkCard, type BookmarkCardData } from "@/components/bookmark-card";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  const bookmarkCards: BookmarkCardData[] = bookmarks.map((b) => ({
    id: b.id,
    url: b.url,
    title: b.title,
    description: b.description,
    image: b.image,
    favicon: b.favicon,
    isFavorite: b.isFavorite,
    createdAt: b.createdAt.toISOString(),
    tags: b.tags.map((bt) => bt.tag),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">All Bookmarks</h1>
        <p className="mt-1 text-sm text-stone-500">
          {bookmarkCards.length === 0
            ? "Your bookmarks will appear here."
            : `${bookmarkCards.length} bookmark${bookmarkCards.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <QuickAddBar />

      {bookmarkCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarkCards.map((bookmark) => (
            <BookmarkCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      )}
    </div>
  );
}
