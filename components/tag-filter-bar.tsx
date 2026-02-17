"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function tagColor(tagName: string) {
  const h = hashCode(tagName) % 360;
  return { bg: `hsl(${h}, 70%, 92%)`, text: `hsl(${h}, 60%, 30%)` };
}

export type TagForFilter = {
  id: string;
  name: string;
  color: string | null;
};

export function TagFilterBar({
  tags,
  selectedTagIds,
  onToggleTag,
  onClearAll,
}: {
  tags: TagForFilter[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClearAll: () => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="space-y-2">
      <div
        className="flex gap-1.5 overflow-x-auto whitespace-nowrap"
        style={{
          maskImage: "linear-gradient(to right, transparent 0, black 8px, black calc(100% - 8px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, black 8px, black calc(100% - 8px), transparent 100%)",
        }}
      >
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          const color = tagColor(tag.name);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleTag(tag.id)}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 min-h-[44px] md:min-h-0 md:py-0.5 text-xs font-medium transition-all",
                isSelected
                  ? "ring-2 ring-stone-400 ring-offset-1"
                  : "opacity-60 hover:opacity-100"
              )}
              style={{
                backgroundColor: color.bg,
                color: color.text,
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>

      {selectedTagIds.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">
            Filtering by {selectedTagIds.length} tag{selectedTagIds.length > 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs text-stone-500 hover:text-stone-700"
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
