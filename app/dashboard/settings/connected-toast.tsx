"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ConnectedToast() {
  useEffect(() => {
    toast.success("X account connected successfully");
  }, []);

  return null;
}
