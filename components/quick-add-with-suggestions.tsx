"use client";

import { useState, useCallback } from "react";
import { QuickAddBar } from "@/components/quick-add-bar";
import { TagSuggestions } from "@/components/tag-suggestions";

export function QuickAddWithSuggestions() {
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);

  const handleBookmarkAdded = useCallback((bookmarkId: string) => {
    setSuggestingFor(bookmarkId);
  }, []);

  const handleDismiss = useCallback(() => {
    setSuggestingFor(null);
  }, []);

  return (
    <div className="space-y-2">
      <QuickAddBar onBookmarkAdded={handleBookmarkAdded} />
      {suggestingFor && (
        <TagSuggestions
          bookmarkId={suggestingFor}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
