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
