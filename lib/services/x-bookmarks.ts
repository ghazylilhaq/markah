export type XCollection = {
  id: string;
  name: string;
};

export type XBookmark = {
  tweetId: string;
  text: string;
  authorHandle: string;
  authorName: string;
  createdAt: string;
  url: string;
};

type XUser = {
  id: string;
  username: string;
  name: string;
};

type XTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
};

type XFolderBookmarksResponse = {
  data?: Array<{ id: string }>;
  meta?: {
    next_token?: string;
    pagination_token?: string;
  };
};

export async function fetchXBookmarksInFolder(
  accessToken: string,
  xUserId: string,
  folderId: string
): Promise<{ tweetIds: string[]; failed: boolean }> {
  const tweetIds: string[] = [];
  let nextToken: string | undefined;
  const MAX_IDS = 500;
  const MAX_RETRIES = 3;

  while (tweetIds.length < MAX_IDS) {
    const params = new URLSearchParams({
      bookmark_folder_id: folderId,
      max_results: "100",
    });
    if (nextToken) {
      params.set("pagination_token", nextToken);
    }

    const url = `https://api.twitter.com/2/users/${xUserId}/bookmarks?${params.toString()}`;

    let response: Response | null = null;
    let lastStatus = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      lastStatus = response.status;
      if (lastStatus !== 429) break;
    }

    if (!response || lastStatus === 429) {
      return { tweetIds: [], failed: true };
    }

    if (!response.ok) {
      console.error(`fetchXBookmarksInFolder: HTTP ${lastStatus}`);
      return { tweetIds: [], failed: true };
    }

    const data = (await response.json()) as XFolderBookmarksResponse;
    for (const tweet of data.data ?? []) {
      tweetIds.push(tweet.id);
      if (tweetIds.length >= MAX_IDS) break;
    }

    const nt = data.meta?.next_token ?? data.meta?.pagination_token;
    if (nt && tweetIds.length < MAX_IDS) {
      nextToken = nt;
    } else {
      break;
    }
  }

  return { tweetIds, failed: false };
}

type XBookmarksResponse = {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
  };
  meta?: {
    next_token?: string;
    result_count?: number;
  };
};

export type FetchXBookmarksResult = {
  bookmarks: XBookmark[];
  hasMore: boolean;
  nextToken?: string;
};

type XFoldersResponse = {
  data?: Array<{ id: string; name: string }>;
};

export async function fetchXBookmarkFolders(
  accessToken: string,
  xUserId: string
): Promise<{ folders: XCollection[]; unavailable: boolean }> {
  try {
    const url = `https://api.twitter.com/2/users/${xUserId}/bookmarks/folders`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 403 || response.status === 404) {
      return { folders: [], unavailable: true };
    }

    if (!response.ok) {
      console.error(`fetchXBookmarkFolders: HTTP ${response.status}`);
      return { folders: [], unavailable: false };
    }

    const data = (await response.json()) as XFoldersResponse;
    const folders: XCollection[] = (data.data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
    }));
    return { folders, unavailable: false };
  } catch (err) {
    console.error("fetchXBookmarkFolders error:", err);
    return { folders: [], unavailable: false };
  }
}

export async function fetchXBookmarks(
  accessToken: string,
  xUserId: string,
  options?: { sinceId?: string; maxResults?: number }
): Promise<FetchXBookmarksResult> {
  const maxResults =
    options?.maxResults ??
    (process.env.MAX_SYNC_BOOKMARKS
      ? parseInt(process.env.MAX_SYNC_BOOKMARKS, 10)
      : 50);

  const allBookmarks: XBookmark[] = [];
  let nextToken: string | undefined;
  let hasMore = false;

  while (allBookmarks.length < maxResults) {
    const remaining = maxResults - allBookmarks.length;
    const pageSize = Math.min(remaining, 100);

    const params = new URLSearchParams({
      "tweet.fields": "id,text,created_at,author_id",
      expansions: "author_id",
      "user.fields": "username,name",
      max_results: String(pageSize),
    });

    if (options?.sinceId) {
      params.set("since_id", options.sinceId);
    }

    if (nextToken) {
      params.set("pagination_token", nextToken);
    }

    const url = `https://api.twitter.com/2/users/${xUserId}/bookmarks?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 429) {
      // Rate limited — return what we have so far
      hasMore = true;
      break;
    }

    if (!response.ok) {
      throw new Error(
        `X API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as XBookmarksResponse;

    if (!data.data || data.data.length === 0) {
      break;
    }

    const userMap = new Map<string, XUser>();
    for (const user of data.includes?.users ?? []) {
      userMap.set(user.id, user);
    }

    for (const tweet of data.data) {
      const author = userMap.get(tweet.author_id);
      const authorHandle = author?.username ?? "unknown";
      const authorName = author?.name ?? "Unknown";

      allBookmarks.push({
        tweetId: tweet.id,
        text: tweet.text,
        authorHandle,
        authorName,
        createdAt: tweet.created_at,
        url: `https://x.com/${authorHandle}/status/${tweet.id}`,
      });

      if (allBookmarks.length >= maxResults) {
        break;
      }
    }

    if (data.meta?.next_token && allBookmarks.length < maxResults) {
      nextToken = data.meta.next_token;
      hasMore = true;
    } else {
      hasMore = false;
      nextToken = undefined;
      break;
    }
  }

  // If we stopped because we hit maxResults but there was a next_token, hasMore stays true
  // If we stopped because no more pages, hasMore is false
  return {
    bookmarks: allBookmarks,
    hasMore,
    nextToken,
  };
}
