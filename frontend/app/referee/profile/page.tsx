"use client";

import React from "react";
import { Phone, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";

export default function RefereeProfilePage() {
  const { user, logout } = useAuth();

  return (
    <>
      <Navbar title="Profile" />

      <main className="max-w-xl mx-auto w-full px-4 pt-6 flex flex-col gap-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#FFF1E8] border border-brand/20 text-brand text-[24px] font-bold flex items-center justify-center mb-3">
            YE
          </div>
          <h2 className="text-[20px] font-bold text-ink tracking-tight">
            {user?.name || "Youssef El Amrani"}
          </h2>
          <p className="text-[13px] text-ink-muted mt-0.5">
            License 1104 • National Referee
          </p>

          <div className="flex items-center gap-4 text-[13px] text-ink-muted mt-3">
            <span className="flex items-center gap-1.5">
              <Phone size={14} strokeWidth={1.75} />
              06 61 23 45 67
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Mail size={14} strokeWidth={1.75} />
              {user?.email || "y.elamrani@mail.ma"}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Assigned" value="24" />
          <StatCard label="Confirmed" value="20" highlight="success" />
          <StatCard label="Refused" value="4" highlight="danger" />
        </div>

        {/* Account Info */}
        <Card className="divide-y divide-line p-0 overflow-hidden">
          <div className="p-3.5 flex items-center justify-between text-[14px]">
            <span className="text-ink-muted">League Pool</span>
            <span className="font-medium text-ink">Morocco Basketball Fed.</span>
          </div>
          <div className="p-3.5 flex items-center justify-between text-[14px]">
            <span className="text-ink-muted">Grade</span>
            <span className="font-medium text-ink">Level 1 Elite</span>
          </div>
          <div className="p-3.5 flex items-center justify-between text-[14px]">
            <span className="text-ink-muted">Status</span>
            <span className="font-medium text-success">Active Official</span>
          </div>
        </Card>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={logout}
          className="text-danger hover:text-danger hover:bg-danger-tint border-danger/20"
        >
          <LogOut size={18} strokeWidth={1.75} className="mr-2" />
          Sign out
        </Button>
      </main>
    </>
  );
}
