"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { tagToColor, tagBadgeStyle } from "@/lib/utils/tag-color";
import {
  getBookmarkDetails,
  getUserTags,
  getUserFolders,
  updateBookmark,
} from "@/lib/actions/bookmark";
import { useRouter } from "next/navigation";

type FolderOption = { id: string; name: string; parentId: string | null };

export function EditBookmarkDialog({
  bookmarkId,
  open,
  onOpenChange,
}: {
  bookmarkId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [folderIds, setFolderIds] = useState<string[]>([]);

  const [tagInput, setTagInput] = useState("");
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [allFolders, setAllFolders] = useState<FolderOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      getBookmarkDetails(bookmarkId),
      getUserTags(),
      getUserFolders(),
    ]).then(([details, userTags, userFolders]) => {
      if (details) {
        setTitle(details.title);
        setDescription(details.description);
        setTags(details.tags);
        setFolderIds(details.folderIds);
      }
      setAllTags(userTags);
      setAllFolders(userFolders);
      setLoading(false);
    });
  }, [open, bookmarkId]);

  const filteredSuggestions = allTags
    .filter(
      (t) =>
        !tags.includes(t.name) &&
        t.name.toLowerCase().includes(tagInput.toLowerCase())
    )
    .slice(0, 8);

  function addTag(name: string) {
    const trimmed = name.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
    setShowSuggestions(false);
  }

  function removeTag(name: string) {
    setTags(tags.filter((t) => t !== name));
  }

  function toggleFolder(folderId: string) {
    setFolderIds((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateBookmark(bookmarkId, {
        title,
        description,
        tagNames: tags,
        folderIds,
      });
      router.refresh();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  function getFolderLabel(folder: FolderOption): string {
    if (!folder.parentId) return folder.name;
    const parent = allFolders.find((f) => f.id === folder.parentId);
    if (!parent) return folder.name;
    return `${getFolderLabel(parent)} / ${folder.name}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-dvh max-h-dvh w-full max-w-full rounded-none top-0 left-0 translate-x-0 translate-y-0 flex flex-col md:h-auto md:max-h-[85dvh] md:max-w-lg md:rounded-lg md:top-[50%] md:left-[50%] md:translate-x-[-50%] md:translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
          <DialogDescription>Update bookmark details, tags, and folder assignments.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-stone-500">
            Loading...
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="border-input bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pr-1 text-xs"
                    style={tagBadgeStyle(tag)}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-0.5 flex items-center justify-center hover:bg-black/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="relative">
                <Input
                  ref={tagInputRef}
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tagInput.trim()) addTag(tagInput);
                    }
                  }}
                />
                {showSuggestions && tagInput && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full z-10 mt-1 w-full rounded-md border border-stone-200 bg-white py-1 shadow-lg">
                    {filteredSuggestions.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-stone-50"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addTag(tag.name);
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tagToColor(tag.name) }}
                        />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Folders */}
            {allFolders.length > 0 && (
              <div className="space-y-2">
                <Label>Folders</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-stone-200 p-3">
                  {allFolders.map((folder) => (
                    <label
                      key={folder.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={folderIds.includes(folder.id)}
                        onCheckedChange={() => toggleFolder(folder.id)}
                      />
                      <span className="text-stone-700">
                        {getFolderLabel(folder)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
