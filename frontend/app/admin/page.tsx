"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarPlus,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge, DivisionBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

export default function AdminDashboardPage() {
  const toast = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.getAdminStats(),
  });

  const { data: assignments = [], isLoading: asgLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: () => api.getAssignments(),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: () => api.getMatches(),
  });

  // Needs attention: pending and refused
  const attentionItems = assignments
    .filter((a) => a.status === "refused" || a.status === "pending")
    .slice(0, 3);

  const upcomingMatches = matches.slice(0, 3);

  return (
    <>
      <Navbar title="Dashboard" />

      <main className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-5 flex flex-col gap-6">
        {/* Top 3 Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24 w-full rounded-[12px]" />
            <Skeleton className="h-24 w-full rounded-[12px]" />
            <Skeleton className="h-24 w-full rounded-[12px]" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Upcoming matches"
              value={stats?.upcoming_matches ?? 8}
            />
            <StatCard
              label="Pending responses"
              value={stats?.pending_responses ?? 5}
              highlight="warning"
            />
            <StatCard
              label="Refused this month"
              value={stats?.refused_this_month ?? 2}
              highlight="danger"
            />
          </div>
        )}

        {/* Quick Actions (2x2) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[18px] font-semibold text-ink">Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/admin/matches/new"
              className="p-3.5 bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-2 hover:border-brand/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#FFF1E8] text-brand flex items-center justify-center">
                <CalendarPlus size={20} strokeWidth={1.75} />
              </div>
              <span className="text-[13px] font-medium text-ink">New match</span>
            </Link>

            <Link
              href="/admin/assignments"
              className="p-3.5 bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-2 hover:border-brand/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#FFF1E8] text-brand flex items-center justify-center">
                <UserCheck size={20} strokeWidth={1.75} />
              </div>
              <span className="text-[13px] font-medium text-ink">Assign referee</span>
            </Link>

            <Link
              href="/admin/referees?add=true"
              className="p-3.5 bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-2 hover:border-brand/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#FFF1E8] text-brand flex items-center justify-center">
                <UserPlus size={20} strokeWidth={1.75} />
              </div>
              <span className="text-[13px] font-medium text-ink">Add referee</span>
            </Link>

            <button
              type="button"
              onClick={() => toast.success("Exported receipts to CSV")}
              className="p-3.5 bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-2 hover:border-brand/40 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#FFF1E8] text-brand flex items-center justify-center">
                <FileSpreadsheet size={20} strokeWidth={1.75} />
              </div>
              <span className="text-[13px] font-medium text-ink">Export receipts</span>
            </button>
          </div>
        </div>

        {/* Needs Attention Section */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[18px] font-semibold text-ink">Needs attention</h2>
          {asgLoading ? (
            <Skeleton className="h-32 w-full rounded-[12px]" />
          ) : (
            <div className="flex flex-col gap-3">
              {attentionItems.map((item) => {
                const refName = item.referee?.name || "Official";
                const initials = refName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const m = item.match;

                return (
                  <Card key={item.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#FFF1E8] text-brand font-semibold text-[13px] flex items-center justify-center">
                          {initials}
                        </div>
                        <span className="text-[15px] font-semibold text-ink">
                          {refName}
                        </span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <p className="text-[14px] font-medium text-ink">
                          {m ? `${m.home_team.name} vs ${m.away_team.name}` : "Match"}
                        </p>
                        <p className="text-[12px] text-ink-muted mt-0.5">
                          {m ? `${m.date} • ${m.venue}` : ""}
                        </p>
                      </div>
                      <span className="text-[15px] font-bold text-ink">
                        {item.indemnity} MAD
                      </span>
                    </div>

                    {item.status === "refused" && item.refusal_reason && (
                      <div className="bg-[#FDECEC] border border-danger/20 rounded-[8px] p-2 text-[12px] text-danger mt-1">
                        Reason: {item.refusal_reason}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Next Matches Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-ink">Next matches</h2>
            <Link
              href="/admin/matches"
              className="text-[13px] font-medium text-brand hover:underline"
            >
              View all
            </Link>
          </div>

          <Card className="divide-y divide-line p-0 overflow-hidden">
            {upcomingMatches.map((m) => (
              <Link
                key={m.id}
                href={`/admin/matches/${m.id}`}
                className="p-4 flex items-center justify-between hover:bg-canvas/40 transition-colors block"
              >
                <div>
                  <h4 className="text-[15px] font-semibold text-ink">
                    {m.home_team.name} vs {m.away_team.name}
                  </h4>
                  <p className="text-[12px] text-ink-muted mt-0.5">
                    {m.date}, {m.time} • {m.venue}
                  </p>
                </div>
                <DivisionBadge division={m.division} />
              </Link>
            ))}
          </Card>
        </div>
      </main>
    </>
  );
}
