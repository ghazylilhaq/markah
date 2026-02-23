"use client";

import { cn } from "@/lib/utils";

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "manual", label: "Manual" },
  { value: "x", label: "𝕏" },
] as const;

export function SourceFilterBar({
  selectedSource,
  onSourceChange,
}: {
  selectedSource: string;
  onSourceChange: (source: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {SOURCE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSourceChange(option.value)}
          className={cn(
            "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors min-h-[44px] md:min-h-0 md:py-1",
            selectedSource === option.value
              ? "bg-stone-200 text-stone-900"
              : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
