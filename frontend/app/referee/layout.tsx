"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/lib/types";

export default function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["auth-me"],
    queryFn: () => api.getMe(),
    retry: false,
    staleTime: 1000 * 60, // 1 min
  });

  useEffect(() => {
    if (!isLoading) {
      if (isError || !user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      } else if (user.role !== "referee") {
        router.replace("/admin");
      }
    }
  }, [user, isLoading, isError, router, pathname]);

  // Render a full-page skeleton until verified, render NOTHING from protected content before verification
  if (isLoading || isError || !user || user.role !== "referee") {
    return (
      <div className="min-h-screen bg-canvas flex flex-col p-6 animate-pulse">
        <header className="h-14 bg-surface rounded-[12px] border border-line mb-6 w-full" />
        <div className="flex-1 max-w-xl mx-auto w-full flex flex-col gap-4">
          <div className="h-8 bg-surface rounded-[8px] w-48" />
          <div className="h-32 bg-surface rounded-[12px] border border-line w-full" />
          <div className="h-48 bg-surface rounded-[12px] border border-line w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-20 md:pb-6">
      {children}
    </div>
  );
}
