"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  syncXBookmarks,
  toggleXSync,
  disconnectX,
  retryXSync,
} from "@/lib/actions/x-sync";

interface XIntegrationControlsProps {
  xHandle: string;
  syncEnabled: boolean;
  lastSyncedAt: string | null; // ISO string
  lastError: string | null;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

export function XIntegrationControls({
  xHandle,
  syncEnabled: initialSyncEnabled,
  lastSyncedAt,
  lastError,
}: XIntegrationControlsProps) {
  const router = useRouter();
  const [syncing, startSync] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  const [retrying, startRetry] = useTransition();
  const [syncEnabled, setSyncEnabled] = useState(initialSyncEnabled);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  function handleToggleSync(checked: boolean) {
    setSyncEnabled(checked);
    toggleXSync(checked).then((result) => {
      if (!result.success) {
        setSyncEnabled(!checked); // revert
        toast.error("Failed to update sync setting");
      }
    });
  }

  function handleSyncNow() {
    startSync(async () => {
      const result = await syncXBookmarks();
      if (result.success) {
        const parts: string[] = [];
        if (result.imported) parts.push(`Imported ${result.imported} bookmark${result.imported !== 1 ? "s" : ""}`);
        if (result.merged) parts.push(`merged ${result.merged}`);
        if (result.skipped) parts.push(`skipped ${result.skipped}`);
        toast.success(parts.length ? parts.join(", ") : "Sync complete — no new bookmarks");
        router.refresh();
      } else {
        toast.error(result.error ?? "Sync failed");
      }
    });
  }

  function handleDisconnect() {
    startDisconnect(async () => {
      await disconnectX();
      router.push("/dashboard/settings");
    });
  }

  function handleRetry() {
    startRetry(async () => {
      const result = await retryXSync();
      if (result.success) {
        toast.success("Sync re-enabled. Syncing now…");
        router.refresh();
        // Trigger a sync after re-enable
        handleSyncNow();
      } else {
        toast.error(result.error ?? "Failed to retry");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {lastError && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Last sync failed</p>
            <p className="mt-0.5 text-amber-700">{lastError}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Retry"}
          </Button>
        </div>
      )}

      {/* Handle and last sync */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-medium text-stone-900">@{xHandle}</span>
          <span className="ml-2 text-stone-400">
            {lastSyncedAt
              ? `Last synced ${formatRelativeTime(lastSyncedAt)}`
              : "Never synced"}
          </span>
        </div>
      </div>

      {/* Auto-sync toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-stone-900">Auto-sync</p>
          <p className="text-xs text-stone-500">Automatically sync bookmarks periodically</p>
        </div>
        <Switch
          checked={syncEnabled}
          onCheckedChange={handleToggleSync}
          aria-label="Toggle auto-sync"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSyncNow}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Syncing…
            </>
          ) : (
            "Sync Now"
          )}
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowDisconnectDialog(true)}
          disabled={disconnecting}
        >
          Disconnect
        </Button>
      </div>

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect X account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your imported bookmarks will be kept. Only the X connection will be
              removed and automatic sync will stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={disconnecting}
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
