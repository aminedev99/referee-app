"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (role === "admin") {
        router.replace("/admin");
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "referee") {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-20 md:pb-6">
      {children}
    </div>
  );
}
