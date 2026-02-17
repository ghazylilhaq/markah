import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { QuickAddBar } from "@/components/quick-add-bar";
import { BookmarkListView } from "@/components/bookmark-list-view";
import { getBookmarks } from "@/lib/actions/bookmark";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { bookmarks, nextCursor } = await getBookmarks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">All Bookmarks</h1>
        <p className="mt-1 text-sm text-stone-500">
          {bookmarks.length === 0
            ? "Your bookmarks will appear here."
            : `${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <QuickAddBar />

      <BookmarkListView
        initialBookmarks={bookmarks}
        initialCursor={nextCursor}
      />
    </div>
  );
}
