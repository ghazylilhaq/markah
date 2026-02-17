"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function createFolder(name: string, parentId?: string) {
  const user = await requireUser();

  // Get max position for ordering
  const maxPos = await prisma.folder.aggregate({
    where: { userId: user.id, parentId: parentId ?? null },
    _max: { position: true },
  });

  const folder = await prisma.folder.create({
    data: {
      name,
      parentId: parentId ?? null,
      position: (maxPos._max.position ?? 0) + 1,
      userId: user.id,
    },
  });

  return { id: folder.id, name: folder.name };
}

export async function renameFolder(folderId: string, name: string) {
  const user = await requireUser();

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: user.id },
  });
  if (!folder) throw new Error("Folder not found");

  await prisma.folder.update({
    where: { id: folderId },
    data: { name },
  });
}

export async function deleteFolder(folderId: string) {
  const user = await requireUser();

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: user.id },
  });
  if (!folder) throw new Error("Folder not found");

  // Collect all descendant folder IDs (cascade will delete them, but we need to unlink bookmarks first)
  const allFolderIds = await collectDescendantIds(folderId, user.id);

  await prisma.$transaction(async (tx) => {
    // Remove all bookmark-folder associations for this folder and descendants
    // (moves bookmarks to "Unsorted" by removing the folder link)
    await tx.bookmarkFolder.deleteMany({
      where: { folderId: { in: allFolderIds } },
    });

    // Delete the folder (cascade deletes children due to schema onDelete: Cascade)
    await tx.folder.delete({ where: { id: folderId } });
  });
}

async function collectDescendantIds(
  folderId: string,
  userId: string
): Promise<string[]> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId, userId },
    select: { id: true },
  });

  const ids = [folderId];
  for (const child of children) {
    const descendantIds = await collectDescendantIds(child.id, userId);
    ids.push(...descendantIds);
  }
  return ids;
}
