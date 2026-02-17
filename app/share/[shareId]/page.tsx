import { notFound } from "next/navigation";
import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tagBadgeStyle } from "@/lib/utils/tag-color";
import { prisma } from "@/lib/prisma";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function domainToColor(domain: string): string {
  const h = hashCode(domain) % 360;
  return `hsl(${h}, 40%, 85%)`;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type BookmarkWithTags = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  createdAt: Date;
  tags: { tag: { id: string; name: string; color: string | null } }[];
};

function SharedBookmarkCard({ bookmark }: { bookmark: BookmarkWithTags }) {
  const domain = getDomain(bookmark.url);
  const tags = bookmark.tags.map((bt) => bt.tag);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      {/* Thumbnail / Color card */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-48 overflow-hidden"
      >
        {bookmark.image ? (
          <img
            src={bookmark.image}
            alt={bookmark.title || ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: domainToColor(domain) }}
          >
            {bookmark.favicon ? (
              <img src={bookmark.favicon} alt="" className="h-12 w-12" />
            ) : (
              <ExternalLink className="h-10 w-10 text-stone-400" />
            )}
          </div>
        )}
      </a>

      {/* Card body */}
      <div className="p-4">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <h2 className="text-lg font-semibold text-stone-900 hover:underline">
            {bookmark.title || bookmark.url}
          </h2>
        </a>

        {bookmark.description && (
          <p className="mt-2 text-sm text-stone-500">{bookmark.description}</p>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
          {bookmark.favicon && (
            <img src={bookmark.favicon} alt="" className="h-4 w-4" />
          )}
          <span>{domain}</span>
          <span className="text-stone-300">·</span>
          <span>{formatDate(bookmark.createdAt)}</span>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-2 py-0.5"
                style={tagBadgeStyle(tag.name)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
        >
          <ExternalLink className="h-4 w-4" />
          Visit Link
        </a>
      </div>
    </div>
  );
}

function SharedBookmarkGridCard({ bookmark }: { bookmark: BookmarkWithTags }) {
  const domain = getDomain(bookmark.url);
  const tags = bookmark.tags.map((bt) => bt.tag);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white transition-shadow hover:shadow-md">
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-40 overflow-hidden"
      >
        {bookmark.image ? (
          <img
            src={bookmark.image}
            alt={bookmark.title || ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: domainToColor(domain) }}
          >
            {bookmark.favicon ? (
              <img src={bookmark.favicon} alt="" className="h-10 w-10" />
            ) : (
              <ExternalLink className="h-8 w-8 text-stone-400" />
            )}
          </div>
        )}
      </a>

      <div className="p-3">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <h3 className="truncate text-sm font-semibold text-stone-900 hover:underline">
            {bookmark.title || bookmark.url}
          </h3>
        </a>

        {bookmark.description && (
          <p className="mt-1 line-clamp-2 text-xs text-stone-500">
            {bookmark.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
          {bookmark.favicon && (
            <img src={bookmark.favicon} alt="" className="h-3.5 w-3.5" />
          )}
          <span className="truncate">{domain}</span>
          <span className="text-stone-300">·</span>
          <span className="shrink-0">{formatDate(bookmark.createdAt)}</span>
        </div>

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-1.5 py-0"
                style={tagBadgeStyle(tag.name)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  // Try to find a shared bookmark
  const bookmark = await prisma.bookmark.findUnique({
    where: { shareId },
    include: {
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  if (bookmark && bookmark.isPublic) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <Bookmark className="size-5 text-stone-900" />
              <span className="text-lg font-semibold text-stone-900">
                Markah
              </span>
            </Link>
            <span className="text-sm text-stone-400">/ Shared Bookmark</span>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-8">
          <SharedBookmarkCard bookmark={bookmark} />
        </main>
      </div>
    );
  }

  // Try to find a shared folder
  const folder = await prisma.folder.findUnique({
    where: { shareId },
  });

  if (folder && folder.isPublic) {
    const folderBookmarks = await prisma.bookmark.findMany({
      where: {
        folders: { some: { folderId: folder.id } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <Bookmark className="size-5 text-stone-900" />
              <span className="text-lg font-semibold text-stone-900">
                Markah
              </span>
            </Link>
            <span className="max-w-[200px] truncate text-sm text-stone-400">
              / {folder.name}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-2xl font-bold text-stone-900">{folder.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {folderBookmarks.length}{" "}
            {folderBookmarks.length === 1 ? "bookmark" : "bookmarks"}
          </p>

          {folderBookmarks.length === 0 ? (
            <div className="mt-12 text-center text-stone-400">
              <p>No bookmarks in this folder yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {folderBookmarks.map((bm) => (
                <SharedBookmarkGridCard key={bm.id} bookmark={bm} />
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Neither found or not public
  notFound();
}
