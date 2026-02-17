"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fetchLinkPreview } from "@/lib/services/link-preview";
import { getLLMProvider } from "@/lib/services/llm-provider";

export async function addBookmark(url: string) {
  const user = await requireUser();

  // Check for duplicate URL for this user
  const existing = await prisma.bookmark.findFirst({
    where: { url, userId: user.id },
    select: { id: true, title: true },
  });

  if (existing) {
    return { error: "duplicate", bookmarkId: existing.id, title: existing.title };
  }

  // Create bookmark with URL as temporary title
  const bookmark = await prisma.bookmark.create({
    data: {
      url,
      title: url,
      userId: user.id,
    },
  });

  // Async metadata fetch - don't await in the response path
  // Instead, fetch and update in the background
  fetchAndUpdateMetadata(bookmark.id, url).catch(() => {
    // Silently ignore errors - bookmark was already saved
  });

  return { success: true, bookmarkId: bookmark.id };
}

export async function toggleFavorite(bookmarkId: string) {
  const user = await requireUser();

  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
    select: { isFavorite: true },
  });

  if (!bookmark) {
    throw new Error("Bookmark not found");
  }

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: { isFavorite: !bookmark.isFavorite },
  });

  return { isFavorite: !bookmark.isFavorite };
}

export async function getBookmarks(
  cursor?: string,
  limit: number = 20,
  filter?: string
) {
  const user = await requireUser();

  // Build where clause based on filter
  const where: {
    userId: string;
    isFavorite?: boolean;
    folders?: { none: Record<string, never> } | { some: { folderId: string } };
  } = { userId: user.id };

  if (filter === "favorites") {
    where.isFavorite = true;
  } else if (filter === "unsorted") {
    where.folders = { none: {} };
  } else if (filter && filter !== "all") {
    where.folders = { some: { folderId: filter } };
  }

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  const hasMore = bookmarks.length > limit;
  const items = hasMore ? bookmarks.slice(0, limit) : bookmarks;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    bookmarks: items.map((b) => ({
      id: b.id,
      url: b.url,
      title: b.title,
      description: b.description,
      image: b.image,
      favicon: b.favicon,
      isFavorite: b.isFavorite,
      visitCount: b.visitCount,
      lastVisitedAt: b.lastVisitedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      tags: b.tags.map((bt) => bt.tag),
    })),
    nextCursor,
  };
}

export async function recordVisit(bookmarkId: string) {
  const user = await requireUser();

  await prisma.bookmark.updateMany({
    where: { id: bookmarkId, userId: user.id },
    data: {
      visitCount: { increment: 1 },
      lastVisitedAt: new Date(),
    },
  });
}

export async function updateBookmark(
  bookmarkId: string,
  data: {
    title: string;
    description: string;
    tagNames: string[];
    folderIds: string[];
  }
) {
  const user = await requireUser();

  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
  });
  if (!bookmark) throw new Error("Bookmark not found");

  await prisma.$transaction(async (tx) => {
    // Update bookmark fields
    await tx.bookmark.update({
      where: { id: bookmarkId },
      data: {
        title: data.title || null,
        description: data.description || null,
      },
    });

    // Replace tags: delete existing, create/link new ones
    await tx.bookmarkTag.deleteMany({ where: { bookmarkId } });
    for (const name of data.tagNames) {
      const tag = await tx.tag.upsert({
        where: { name_userId: { name, userId: user.id } },
        update: {},
        create: { name, userId: user.id },
      });
      await tx.bookmarkTag.create({
        data: { bookmarkId, tagId: tag.id },
      });
    }

    // Replace folder assignments
    await tx.bookmarkFolder.deleteMany({ where: { bookmarkId } });
    for (const folderId of data.folderIds) {
      await tx.bookmarkFolder.create({
        data: { bookmarkId, folderId },
      });
    }
  });
}

export async function getUserTags() {
  const user = await requireUser();
  return prisma.tag.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
}

export async function getUserFolders() {
  const user = await requireUser();
  return prisma.folder.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });
}

export async function getBookmarkDetails(bookmarkId: string) {
  const user = await requireUser();
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
    include: {
      tags: { include: { tag: { select: { id: true, name: true } } } },
      folders: { include: { folder: { select: { id: true, name: true } } } },
    },
  });
  if (!bookmark) return null;
  return {
    id: bookmark.id,
    title: bookmark.title ?? "",
    description: bookmark.description ?? "",
    tags: bookmark.tags.map((bt) => bt.tag.name),
    folderIds: bookmark.folders.map((bf) => bf.folder.id),
  };
}

export async function deleteBookmark(bookmarkId: string) {
  const user = await requireUser();

  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
  });
  if (!bookmark) throw new Error("Bookmark not found");

  // Delete associations and bookmark (BookmarkTag and BookmarkFolder cascade via schema, but explicit for clarity)
  await prisma.$transaction(async (tx) => {
    await tx.bookmarkTag.deleteMany({ where: { bookmarkId } });
    await tx.bookmarkFolder.deleteMany({ where: { bookmarkId } });
    await tx.bookmark.delete({ where: { id: bookmarkId } });
  });
}

export async function getTagSuggestions(bookmarkId: string): Promise<string[]> {
  const user = await requireUser();

  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
    select: { title: true, description: true, url: true },
  });

  if (!bookmark) return [];

  const provider = getLLMProvider();
  if (!provider) return [];

  try {
    return await provider.suggestTags(
      bookmark.title || "",
      bookmark.description || "",
      bookmark.url
    );
  } catch {
    return [];
  }
}

export async function applyTagSuggestion(
  bookmarkId: string,
  tagName: string
) {
  const user = await requireUser();

  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
  });
  if (!bookmark) throw new Error("Bookmark not found");

  // Upsert tag (get existing or create new)
  const tag = await prisma.tag.upsert({
    where: { name_userId: { name: tagName, userId: user.id } },
    update: {},
    create: { name: tagName, userId: user.id },
  });

  // Link tag to bookmark (skip if already linked)
  const existing = await prisma.bookmarkTag.findFirst({
    where: { bookmarkId, tagId: tag.id },
  });
  if (!existing) {
    await prisma.bookmarkTag.create({
      data: { bookmarkId, tagId: tag.id },
    });
  }

  return { tagId: tag.id, tagName: tag.name };
}

export async function searchBookmarks(
  query: string,
  filter?: string
) {
  const user = await requireUser();

  // Sanitize query: remove special tsquery characters, trim
  const sanitized = query.trim().replace(/[&|!():*<>'"\\]/g, " ").trim();
  if (!sanitized) {
    return getBookmarks(undefined, 20, filter);
  }

  // Build tsquery: split words, join with & (AND), add :* for prefix matching
  const tsquery = sanitized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}:*`)
    .join(" & ");

  // Build filter conditions
  let filterCondition = Prisma.sql``;
  if (filter === "favorites") {
    filterCondition = Prisma.sql`AND b."isFavorite" = true`;
  } else if (filter === "unsorted") {
    filterCondition = Prisma.sql`AND NOT EXISTS (
      SELECT 1 FROM "BookmarkFolder" bf WHERE bf."bookmarkId" = b."id"
    )`;
  } else if (filter && filter !== "all") {
    filterCondition = Prisma.sql`AND EXISTS (
      SELECT 1 FROM "BookmarkFolder" bf WHERE bf."bookmarkId" = b."id" AND bf."folderId" = ${filter}
    )`;
  }

  // Search using tsvector + tag ILIKE
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      url: string;
      title: string | null;
      description: string | null;
      image: string | null;
      favicon: string | null;
      isFavorite: boolean;
      visitCount: number;
      lastVisitedAt: Date | null;
      createdAt: Date;
      rank: number;
    }>
  >(Prisma.sql`
    SELECT DISTINCT b."id", b."url", b."title", b."description", b."image",
           b."favicon", b."isFavorite", b."visitCount", b."lastVisitedAt",
           b."createdAt",
           ts_rank(b."search_vector", to_tsquery('english', ${tsquery})) as rank
    FROM "Bookmark" b
    LEFT JOIN "BookmarkTag" bt ON bt."bookmarkId" = b."id"
    LEFT JOIN "Tag" t ON t."id" = bt."tagId"
    WHERE b."userId" = ${user.id}
      AND (
        b."search_vector" @@ to_tsquery('english', ${tsquery})
        OR t."name" ILIKE ${`%${sanitized}%`}
      )
      ${filterCondition}
    ORDER BY rank DESC, b."createdAt" DESC
    LIMIT 40
  `);

  // Fetch tags for the matching bookmarks
  const bookmarkIds = results.map((r) => r.id);
  const bookmarkTags =
    bookmarkIds.length > 0
      ? await prisma.bookmarkTag.findMany({
          where: { bookmarkId: { in: bookmarkIds } },
          include: { tag: { select: { id: true, name: true, color: true } } },
        })
      : [];

  const tagsByBookmarkId = new Map<
    string,
    Array<{ id: string; name: string; color: string | null }>
  >();
  for (const bt of bookmarkTags) {
    const arr = tagsByBookmarkId.get(bt.bookmarkId) ?? [];
    arr.push(bt.tag);
    tagsByBookmarkId.set(bt.bookmarkId, arr);
  }

  return {
    bookmarks: results.map((b) => ({
      id: b.id,
      url: b.url,
      title: b.title,
      description: b.description,
      image: b.image,
      favicon: b.favicon,
      isFavorite: b.isFavorite,
      visitCount: b.visitCount,
      lastVisitedAt: b.lastVisitedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      tags: tagsByBookmarkId.get(b.id) ?? [],
    })),
    nextCursor: null,
  };
}

async function fetchAndUpdateMetadata(bookmarkId: string, url: string) {
  const preview = await fetchLinkPreview(url);

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: {
      title: preview.title || url,
      description: preview.description,
      image: preview.image,
      favicon: preview.favicon,
    },
  });
}
