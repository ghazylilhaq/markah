import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { refreshXToken } from "@/lib/services/x-auth";
import { fetchXBookmarks } from "@/lib/services/x-bookmarks";
import { getLLMProvider } from "@/lib/services/llm-provider";

async function autoTagBookmark(
  bookmarkId: string,
  title: string,
  description: string,
  url: string,
  userId: string
) {
  const provider = getLLMProvider();
  if (!provider) return;

  try {
    const tags = await provider.suggestTags(title, description, url);
    for (const tagName of tags.slice(0, 3)) {
      const tag = await prisma.tag.upsert({
        where: { name_userId: { name: tagName, userId } },
        update: {},
        create: { name: tagName, userId },
      });
      await prisma.bookmarkTag
        .create({ data: { bookmarkId, tagId: tag.id } })
        .catch(() => {}); // Skip if already linked
    }
  } catch {
    // Silently ignore — tags are optional
  }
}

function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^twitter\.com\//, "x.com/")
    .replace(/\/$/, "");
}

async function getOrCreateXBookmarksFolder(userId: string): Promise<string> {
  const existing = await prisma.folder.findFirst({
    where: { name: "X Bookmarks", userId },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const folder = await prisma.folder.create({
    data: { name: "X Bookmarks", userId },
    select: { id: true },
  });

  return folder.id;
}

export type SyncResult = {
  success: boolean;
  imported?: number;
  merged?: number;
  skipped?: number;
  error?: string;
};

/**
 * Core sync logic shared between the syncXBookmarks server action and the cron route.
 * Does NOT call requireUser() — caller must pass a trusted userId.
 */
export async function performXSync(userId: string): Promise<SyncResult> {
  const integration = await prisma.xIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    return { success: false, error: "X account not connected" };
  }

  // Refresh token if expired
  let accessToken = integration.accessToken;
  if (integration.expiresAt < new Date()) {
    accessToken = await refreshXToken(integration);
  }

  // Fetch bookmarks from X API
  const result = await fetchXBookmarks(accessToken, integration.xUserId, {
    sinceId: integration.lastSyncedTweetId ?? undefined,
  });

  // Ensure X Bookmarks folder exists
  const xFolderId = await getOrCreateXBookmarksFolder(userId);

  let imported = 0;
  let merged = 0;
  let skipped = 0;
  let mostRecentTweetId: string | null = null;

  for (const xBookmark of result.bookmarks) {
    // Track most recent tweet ID (first item since X returns newest first)
    if (!mostRecentTweetId) {
      mostRecentTweetId = xBookmark.tweetId;
    }

    // Skip if already imported (dedup by externalId)
    const existingByExternalId = await prisma.bookmark.findFirst({
      where: { externalId: xBookmark.tweetId, userId },
      select: { id: true },
    });

    if (existingByExternalId) {
      skipped++;
      continue;
    }

    // Check for URL match with existing bookmarks (merge logic)
    const normalizedIncoming = normalizeUrl(xBookmark.url);
    const allUserBookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { id: true, url: true },
    });

    const urlMatch = allUserBookmarks.find(
      (b) => normalizeUrl(b.url) === normalizedIncoming
    );

    if (urlMatch) {
      // Merge: update existing bookmark with X source info, keep existing tags/folders
      await prisma.bookmark.update({
        where: { id: urlMatch.id },
        data: { source: "x", externalId: xBookmark.tweetId },
      });
      merged++;
      continue;
    }

    // Create title from first 100 chars of tweet text
    const title =
      xBookmark.text.length > 100
        ? xBookmark.text.slice(0, 97) + "..."
        : xBookmark.text;

    // Create new bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        url: xBookmark.url,
        title,
        description: xBookmark.text,
        source: "x",
        externalId: xBookmark.tweetId,
        userId,
      },
    });

    // Add to X Bookmarks folder
    await prisma.bookmarkFolder
      .create({ data: { bookmarkId: bookmark.id, folderId: xFolderId } })
      .catch(() => {}); // Skip if already in folder

    imported++;

    // Fire AI tag suggestions async (non-blocking)
    autoTagBookmark(bookmark.id, title, xBookmark.text, xBookmark.url, userId).catch(
      () => {}
    );
  }

  // Update XIntegration: lastSyncedAt and lastSyncedTweetId
  await prisma.xIntegration.update({
    where: { userId },
    data: {
      lastSyncedAt: new Date(),
      ...(mostRecentTweetId ? { lastSyncedTweetId: mostRecentTweetId } : {}),
    },
  });

  revalidatePath("/dashboard", "layout");

  return { success: true, imported, merged, skipped };
}
