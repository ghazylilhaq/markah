"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { performXSync, type SyncResult } from "@/lib/services/x-sync-core";

export async function syncXBookmarks(): Promise<SyncResult> {
  const user = await requireUser();
  return performXSync(user.id);
}

export async function toggleXSync(enabled: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await requireUser();

  const integration = await prisma.xIntegration.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!integration) {
    return { success: false, error: "X account not connected" };
  }

  await prisma.xIntegration.update({
    where: { userId: user.id },
    data: { syncEnabled: enabled },
  });

  return { success: true };
}

export async function disconnectX(): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await requireUser();

  await prisma.xIntegration.delete({
    where: { userId: user.id },
  });

  // Convert all X-managed folders to regular user folders
  await prisma.folder.updateMany({
    where: { userId: user.id, isSyncManaged: true },
    data: { isSyncManaged: false, xCollectionId: null },
  });

  // Remove stale sync status so it doesn't show on reconnect
  await prisma.xSyncStatus.deleteMany({
    where: { userId: user.id },
  });

  revalidatePath("/dashboard/settings");

  return { success: true };
}

export async function retryXSync(): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await requireUser();

  const integration = await prisma.xIntegration.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!integration) {
    return { success: false, error: "X account not connected" };
  }

  await prisma.xIntegration.update({
    where: { userId: user.id },
    data: { retryCount: 0, lastError: null, syncEnabled: true },
  });

  return { success: true };
}
