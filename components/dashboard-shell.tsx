"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Menu, LogOut, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar, type Folder } from "@/components/sidebar";

type User = {
  id: string;
  email: string | null;
  name: string | null;
};

export function DashboardShell({
  user,
  folders,
  children,
}: {
  user: User;
  folders: Folder[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-[250px] shrink-0 border-r border-stone-200 bg-white md:block">
        <div className="flex h-14 items-center gap-2 border-b border-stone-200 px-4">
          <Bookmark className="h-5 w-5 text-stone-900" />
          <span className="text-sm font-semibold text-stone-900">Markah</span>
        </div>
        <div className="overflow-y-auto" style={{ height: "calc(100vh - 3.5rem)" }}>
          <Sidebar folders={folders} />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] p-0">
                <SheetTitle className="flex h-14 items-center gap-2 border-b border-stone-200 px-4">
                  <Bookmark className="h-5 w-5 text-stone-900" />
                  <span className="text-sm font-semibold text-stone-900">
                    Markah
                  </span>
                </SheetTitle>
                <div onClick={() => setOpen(false)}>
                  <Sidebar folders={folders} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 md:hidden">
              <Bookmark className="h-5 w-5 text-stone-900" />
              <span className="text-sm font-semibold text-stone-900">
                Markah
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-500 sm:inline">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ redirectTo: "/" })}
              className="text-stone-600"
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
