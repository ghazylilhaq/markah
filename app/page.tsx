import Link from "next/link";
import { Bookmark, FolderOpen, Search, Share2, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Bookmark className="size-6 text-stone-900" />
          <span className="text-xl font-semibold text-stone-900">Markah</span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6">
        <section className="flex flex-col items-center text-center pt-24 pb-16">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Your bookmarks,
            <br />
            organized and searchable.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-stone-600">
            Markah is a self-hosted bookmark manager with auto-fetched metadata,
            AI tag suggestions, folder organization, full-text search, and
            public sharing.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        {/* Placeholder illustration area */}
        <section className="mx-auto max-w-2xl rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 py-20">
            <div className="flex flex-col items-center gap-2 text-stone-400">
              <Bookmark className="size-10" />
              <span className="text-sm">Bookmark preview</span>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="grid gap-6 py-20 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Sparkles className="size-5" />}
            title="AI Tag Suggestions"
            description="Automatically categorize bookmarks with intelligent tag suggestions powered by AI."
          />
          <FeatureCard
            icon={<FolderOpen className="size-5" />}
            title="Nested Folders"
            description="Organize bookmarks into folders with up to 3 levels of nesting."
          />
          <FeatureCard
            icon={<Search className="size-5" />}
            title="Full-Text Search"
            description="Find any bookmark instantly by searching titles, descriptions, URLs, or tags."
          />
          <FeatureCard
            icon={<Tag className="size-5" />}
            title="Auto Metadata"
            description="Paste a URL and Markah fetches the title, description, and thumbnail for you."
          />
          <FeatureCard
            icon={<Share2 className="size-5" />}
            title="Public Sharing"
            description="Share individual bookmarks or entire folders with a public link."
          />
          <FeatureCard
            icon={<Bookmark className="size-5" />}
            title="Self-Hosted"
            description="Keep your data under your control. Deploy anywhere with Docker."
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        Markah — Self-hosted bookmark manager
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-stone-100 text-stone-700">
        {icon}
      </div>
      <h3 className="font-medium text-stone-900">{title}</h3>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </div>
  );
}
