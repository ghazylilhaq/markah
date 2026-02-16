import { QuickAddBar } from "@/components/quick-add-bar";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">All Bookmarks</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your bookmarks will appear here.
        </p>
      </div>

      <QuickAddBar />
    </div>
  );
}
