"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RootPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!role) {
      router.replace("/login");
    } else if (role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/referee");
    }
  }, [role, loading, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-canvas min-h-screen">
      <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
