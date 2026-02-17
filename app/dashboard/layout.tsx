import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import type { Folder } from "@/components/sidebar";

function buildFolderTree(
  folders: { id: string; name: string; parentId: string | null; position: number }[]
): Folder[] {
  const map = new Map<string, Folder>();
  const roots: Folder[] = [];

  for (const f of folders) {
    map.set(f.id, { id: f.id, name: f.name, parentId: f.parentId, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, parentId: true, position: true },
    orderBy: { position: "asc" },
  });

  const folderTree = buildFolderTree(folders);

  return (
    <DashboardShell user={user} folders={folderTree}>
      {children}
    </DashboardShell>
  );
}
