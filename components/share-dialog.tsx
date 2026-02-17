"use client";

import { useState, useEffect } from "react";
import { Copy, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  toggleBookmarkShare,
  getBookmarkShareInfo,
} from "@/lib/actions/bookmark";
import {
  toggleFolderShare,
  getFolderShareInfo,
} from "@/lib/actions/folder";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "bookmark" | "folder";
  id: string;
  name: string;
};

export function ShareDialog({
  open,
  onOpenChange,
  type,
  id,
  name,
}: ShareDialogProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const fetchInfo =
      type === "bookmark"
        ? getBookmarkShareInfo(id)
        : getFolderShareInfo(id);
    fetchInfo
      .then((info) => {
        setIsPublic(info.isPublic);
        setShareId(info.shareId);
      })
      .catch(() => toast.error("Failed to load share info"))
      .finally(() => setLoading(false));
  }, [open, id, type]);

  async function handleToggle() {
    setToggling(true);
    try {
      const result =
        type === "bookmark"
          ? await toggleBookmarkShare(id)
          : await toggleFolderShare(id);
      setIsPublic(result.isPublic);
      setShareId(result.shareId);
      toast.success(result.isPublic ? "Link is now public" : "Link is now private");
    } catch {
      toast.error("Failed to update sharing");
    } finally {
      setToggling(false);
    }
  }

  const shareUrl =
    shareId && typeof window !== "undefined"
      ? `${window.location.origin}/share/${shareId}`
      : "";

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Share
          </DialogTitle>
          <DialogDescription>
            Share &quot;{name}&quot; with a public link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="share-toggle" className="text-sm font-medium">
              Public link
            </Label>
            <Switch
              id="share-toggle"
              checked={isPublic}
              disabled={loading || toggling}
              onCheckedChange={handleToggle}
            />
          </div>

          {isPublic && shareId && (
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!isPublic && (
            <p className="text-sm text-stone-500">
              Enable the public link to share this {type} with anyone.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
