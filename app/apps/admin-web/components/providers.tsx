"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

import { queryClient } from "@/lib/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
