"use server";

export interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
}

function getMetaContent(html: string, property: string): string | null {
  // Match both property="..." and name="..." attributes
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*/?>|` +
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["'][^>]*/?>`,
    "i"
  );
  const match = html.match(regex);
  return match ? (match[1] ?? match[2] ?? null) : null;
}

function getTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() || null : null;
}

function getFavicon(html: string, baseUrl: string): string | null {
  // Look for <link rel="icon" ...> or <link rel="shortcut icon" ...>
  const regex =
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["'][^>]*\/?>|<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["'][^>]*\/?>/i;
  const match = html.match(regex);
  const href = match ? (match[1] ?? match[2] ?? null) : null;

  if (href) {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }

  // Default to /favicon.ico on the domain
  try {
    const url = new URL(baseUrl);
    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function resolveUrl(url: string | null, baseUrl: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Markah/1.0; +https://markah.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        title: titleFromUrl(url),
        description: null,
        image: null,
        favicon: null,
      };
    }

    const html = await response.text();

    const ogTitle = getMetaContent(html, "og:title");
    const ogDescription = getMetaContent(html, "og:description");
    const ogImage = getMetaContent(html, "og:image");

    const title =
      ogTitle || getTitle(html) || getMetaContent(html, "title") || null;
    const description =
      ogDescription || getMetaContent(html, "description") || null;
    const image = resolveUrl(ogImage, url);
    const favicon = getFavicon(html, url);

    return { title, description, image, favicon };
  } catch {
    // On any error (timeout, network, parse), return partial data
    return {
      title: titleFromUrl(url),
      description: null,
      image: null,
      favicon: null,
    };
  }
}
