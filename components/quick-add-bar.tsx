"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addBookmark } from "@/lib/actions/bookmark";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    // Try prepending https://
    try {
      const url = new URL(`https://${str}`);
      return url.protocol === "https:" && str.includes(".");
    } catch {
      return false;
    }
  }
}

function normalizeUrl(str: string): string {
  try {
    new URL(str);
    return str;
  } catch {
    return `https://${str}`;
  }
}

export function QuickAddBar({
  onBookmarkAdded,
}: {
  onBookmarkAdded?: (bookmarkId: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || !isValidUrl(trimmed)) return;

    setLoading(true);
    try {
      const result = await addBookmark(normalizeUrl(trimmed));

      if (result.error === "duplicate") {
        toast.info("Bookmark already exists", {
          description: result.title || trimmed,
        });
      } else if (result.success && result.bookmarkId) {
        setUrl("");
        router.refresh();
        onBookmarkAdded?.(result.bookmarkId);
      }
    } catch {
      toast.error("Failed to save bookmark");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Paste a URL to save..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !url.trim()}>
        {loading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-1.5 h-4 w-4" />
        )}
        {loading ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
