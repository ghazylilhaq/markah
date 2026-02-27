"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function XSyncBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-1 inline-flex shrink-0 items-center justify-center rounded px-0.5 text-[10px] font-bold leading-none text-stone-400 hover:text-stone-600 cursor-default select-none">
          𝕏
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">
        Synced from X — edits may be overwritten on next sync
      </TooltipContent>
    </Tooltip>
  );
}
