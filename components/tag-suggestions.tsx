"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { getTagSuggestions, applyTagSuggestion } from "@/lib/actions/bookmark";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function tagToColor(tagName: string): string {
  const h = hashCode(tagName) % 360;
  return `hsl(${h}, 55%, 50%)`;
}

export function TagSuggestions({
  bookmarkId,
  onDismiss,
}: {
  bookmarkId: string;
  onDismiss: () => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    // Wait a brief moment for metadata to be fetched first
    const timer = setTimeout(async () => {
      try {
        const tags = await getTagSuggestions(bookmarkId);
        if (!cancelled) {
          setSuggestions(tags);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bookmarkId]);

  async function handleApply(tagName: string) {
    setApplying(tagName);
    try {
      await applyTagSuggestion(bookmarkId, tagName);
      setSuggestions((prev) => prev.filter((t) => t !== tagName));
      toast.success(`Tag "${tagName}" added`);
      router.refresh();
    } catch {
      toast.error(`Failed to add tag "${tagName}"`);
    } finally {
      setApplying(null);
    }
  }

  function handleDismissTag(tagName: string) {
    setSuggestions((prev) => prev.filter((t) => t !== tagName));
  }

  // Auto-dismiss when all suggestions are gone
  useEffect(() => {
    if (!loading && suggestions.length === 0) {
      onDismiss();
    }
  }, [loading, suggestions.length, onDismiss]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Getting AI tag suggestions...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-stone-500">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span>Suggested tags:</span>
      </div>
      {suggestions.map((tag) => (
        <button
          key={tag}
          onClick={() => handleApply(tag)}
          disabled={applying !== null}
          className="group/tag inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: `${tagToColor(tag)}20`,
            color: tagToColor(tag),
            borderWidth: "1px",
            borderColor: `${tagToColor(tag)}40`,
          }}
        >
          {applying === tag ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <span>{tag}</span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismissTag(tag);
                }}
                className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-black/10 group-hover/tag:opacity-100"
                aria-label={`Dismiss ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </span>
            </>
          )}
        </button>
      ))}
      <button
        onClick={onDismiss}
        className="ml-auto text-xs text-stone-400 hover:text-stone-600"
      >
        Dismiss all
      </button>
    </div>
  );
}
