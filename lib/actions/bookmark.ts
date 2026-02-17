"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fetchLinkPreview } from "@/lib/services/link-preview";

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

export async function getBookmarks(cursor?: string, limit: number = 20) {
  const user = await requireUser();

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
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
