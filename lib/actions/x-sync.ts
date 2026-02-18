"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
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

export async function syncXBookmarks(): Promise<{
  success: boolean;
  imported?: number;
  skipped?: number;
  error?: string;
}> {
  const user = await requireUser();

  // Fetch XIntegration record
  const integration = await prisma.xIntegration.findUnique({
    where: { userId: user.id },
  });

  if (!integration) {
    return { success: false, error: "X account not connected" };
  }

  // Refresh token if expired
  let accessToken = integration.accessToken;
  if (integration.expiresAt < new Date()) {
    try {
      accessToken = await refreshXToken(integration);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Token refresh failed";
      return { success: false, error: message };
    }
  }

  // Fetch bookmarks from X API
  const result = await fetchXBookmarks(accessToken, integration.xUserId, {
    sinceId: integration.lastSyncedTweetId ?? undefined,
  });

  let imported = 0;
  let skipped = 0;
  let mostRecentTweetId: string | null = null;

  for (const xBookmark of result.bookmarks) {
    // Track most recent tweet ID (first item since X returns newest first)
    if (!mostRecentTweetId) {
      mostRecentTweetId = xBookmark.tweetId;
    }

    // Skip if already imported (dedup by externalId)
    const existing = await prisma.bookmark.findFirst({
      where: { externalId: xBookmark.tweetId, userId: user.id },
      select: { id: true },
    });

    if (existing) {
      skipped++;
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
        userId: user.id,
      },
    });

    imported++;

    // Fire AI tag suggestions async (non-blocking)
    autoTagBookmark(
      bookmark.id,
      title,
      xBookmark.text,
      xBookmark.url,
      user.id
    ).catch(() => {});
  }

  // Update XIntegration: lastSyncedAt and lastSyncedTweetId
  await prisma.xIntegration.update({
    where: { userId: user.id },
    data: {
      lastSyncedAt: new Date(),
      ...(mostRecentTweetId
        ? { lastSyncedTweetId: mostRecentTweetId }
        : {}),
    },
  });

  revalidatePath("/dashboard", "layout");

  return { success: true, imported, skipped };
}
