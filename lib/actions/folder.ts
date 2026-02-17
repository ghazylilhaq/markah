"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const MAX_FOLDER_DEPTH = 3;

async function getFolderDepth(
  folderId: string,
  userId: string
): Promise<number> {
  let depth = 0;
  let currentId: string | null = folderId;
  while (currentId) {
    depth++;
    const parent: { parentId: string | null } | null =
      await prisma.folder.findFirst({
        where: { id: currentId, userId },
        select: { parentId: true },
      });
    currentId = parent?.parentId ?? null;
  }
  return depth;
}

export async function createFolder(name: string, parentId?: string) {
  const user = await requireUser();

  // Enforce max nesting depth
  if (parentId) {
    const parentDepth = await getFolderDepth(parentId, user.id);
    if (parentDepth >= MAX_FOLDER_DEPTH) {
      throw new Error("Maximum folder nesting depth (3 levels) reached");
    }
  }

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

  revalidatePath("/dashboard", "layout");
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

  revalidatePath("/dashboard", "layout");
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

  revalidatePath("/dashboard", "layout");
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

/**
 * Get the depth of a folder's subtree (how deep its deepest descendant is).
 * A leaf folder has subtree depth 0. A folder with one level of children has subtree depth 1.
 */
async function getSubtreeDepth(
  folderId: string,
  userId: string
): Promise<number> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId, userId },
    select: { id: true },
  });

  if (children.length === 0) return 0;

  let maxChildDepth = 0;
  for (const child of children) {
    const childDepth = await getSubtreeDepth(child.id, userId);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }
  return 1 + maxChildDepth;
}

export async function moveFolderToParent(
  folderId: string,
  newParentId: string | null
) {
  const user = await requireUser();

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: user.id },
  });
  if (!folder) throw new Error("Folder not found");

  // Cannot move a folder into itself
  if (newParentId === folderId) {
    throw new Error("Cannot move a folder into itself");
  }

  // Cannot move a folder into one of its descendants
  if (newParentId) {
    const descendantIds = await collectDescendantIds(folderId, user.id);
    if (descendantIds.includes(newParentId)) {
      throw new Error("Cannot move a folder into its own descendant");
    }
  }

  // Enforce max nesting depth: parent depth + subtree depth of moved folder + 1 <= MAX_FOLDER_DEPTH
  if (newParentId) {
    const parentDepth = await getFolderDepth(newParentId, user.id);
    const subtreeDepth = await getSubtreeDepth(folderId, user.id);
    if (parentDepth + subtreeDepth + 1 > MAX_FOLDER_DEPTH) {
      throw new Error("Maximum folder nesting depth (3 levels) would be exceeded");
    }
  } else {
    // Moving to root - just check subtree depth
    const subtreeDepth = await getSubtreeDepth(folderId, user.id);
    if (subtreeDepth + 1 > MAX_FOLDER_DEPTH) {
      throw new Error("Maximum folder nesting depth (3 levels) would be exceeded");
    }
  }

  // Get max position among siblings at the new parent level
  const maxPos = await prisma.folder.aggregate({
    where: { userId: user.id, parentId: newParentId },
    _max: { position: true },
  });

  await prisma.folder.update({
    where: { id: folderId },
    data: {
      parentId: newParentId,
      position: (maxPos._max.position ?? 0) + 1,
    },
  });

  revalidatePath("/dashboard", "layout");
}

export async function toggleFolderShare(folderId: string) {
  const user = await requireUser();

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: user.id },
    select: { isPublic: true, shareId: true },
  });
  if (!folder) throw new Error("Folder not found");

  const newIsPublic = !folder.isPublic;
  const shareId = folder.shareId || crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  await prisma.folder.update({
    where: { id: folderId },
    data: {
      isPublic: newIsPublic,
      shareId,
    },
  });

  return { isPublic: newIsPublic, shareId };
}

export async function getFolderShareInfo(folderId: string) {
  const user = await requireUser();

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: user.id },
    select: { isPublic: true, shareId: true },
  });
  if (!folder) throw new Error("Folder not found");

  return { isPublic: folder.isPublic, shareId: folder.shareId };
}

export async function reorderFolders(folderIds: string[]) {
  await requireUser();

  // Update positions for all folders in the new order
  await prisma.$transaction(
    folderIds.map((id, index) =>
      prisma.folder.update({
        where: { id },
        data: { position: index },
      })
    )
  );

  revalidatePath("/dashboard", "layout");
}
