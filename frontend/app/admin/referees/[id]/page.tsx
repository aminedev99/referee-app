"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, Edit2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Referee } from "@/lib/types";
import { formatPhone } from "@/lib/format";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";

export default function AdminRefereeDetailPage() {
  const params = useParams<{ id: string }>();

  const {
    data: referee,
    isLoading: refLoading,
    isError: refError,
    refetch,
  } = useQuery<Referee>({
    queryKey: ["admin-referee", params.id],
    queryFn: () => api.getRefereeById(params.id),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: () => api.getAssignments(),
  });

  const refereeAssignments = assignments.filter((a) => a.referee_id === params.id);

  if (refLoading) {
    return (
      <>
        <Navbar title="Referee" backHref="/admin/referees" />
        <main className="max-w-xl mx-auto w-full p-4 flex flex-col gap-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-24 w-full rounded-[12px]" />
        </main>
      </>
    );
  }

  if (refError || !referee) {
    return (
      <>
        <Navbar title="Referee" backHref="/admin/referees" />
        <main className="max-w-xl mx-auto w-full p-4">
          <ErrorState message="Could not load referee profile" onRetry={() => refetch()} />
        </main>
      </>
    );
  }

  const initials = (referee.name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RF";

  const displayPhone = formatPhone(referee.phone);
  const displayLicense = referee.license_number?.trim() || "Not provided";
  const displayEmail = referee.email?.trim() || "Not provided";
  const isInactive = referee.is_active === false;

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full h-14 bg-surface border-b border-line px-4 md:px-6 flex items-center justify-between">
        <Navbar title="Referee" backHref="/admin/referees" />
        <Link
          href={`/admin/referees/${params.id}/edit`}
          className="p-2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
          aria-label="Edit referee"
        >
          <Edit2 size={18} strokeWidth={1.75} />
        </Link>
      </header>

      <main className="max-w-xl mx-auto w-full px-4 pt-6 pb-20 flex flex-col gap-6">
        {/* Profile Card Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#FFF1E8] border border-brand/20 text-brand text-[24px] font-bold flex items-center justify-center mb-3">
              {initials}
            </div>
            {isInactive && (
              <span className="absolute bottom-2 right-0 bg-danger text-surface text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full">
                Inactive
              </span>
            )}
          </div>

          <h2 className="text-[22px] font-bold text-ink tracking-tight flex items-center gap-2">
            <span>{referee.name || "Not provided"}</span>
            {isInactive && (
              <span className="text-[12px] font-medium bg-danger-tint text-danger px-2 py-0.5 rounded-full border border-danger/20">
                Inactive
              </span>
            )}
          </h2>

          <p className="text-[13px] text-ink-muted mt-0.5">
            License {displayLicense} • {referee.category || "National Referee"}
          </p>

          <div className="flex items-center gap-4 text-[13px] text-ink-muted mt-3">
            <span className="flex items-center gap-1.5">
              <Phone size={14} strokeWidth={1.75} />
              {displayPhone}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Mail size={14} strokeWidth={1.75} />
              {displayEmail}
            </span>
          </div>
        </div>

        {/* 3 Stat Cards in Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Assigned" value={referee.assigned_count ?? referee.matches_count} />
          <StatCard
            label="Confirmed"
            value={referee.confirmed_count ?? Math.round((referee.matches_count * referee.acceptance_rate) / 100)}
            highlight="success"
          />
          <StatCard
            label="Refused"
            value={referee.refused_count ?? Math.max(0, referee.matches_count - Math.round((referee.matches_count * referee.acceptance_rate) / 100))}
            highlight="danger"
          />
        </div>

        {/* Match History Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h3 className="text-[18px] font-semibold text-ink">Match history</h3>
            </div>
            <span className="text-[12px] font-semibold bg-canvas text-ink-muted px-2 py-0.5 rounded-full">
              {refereeAssignments.length || referee.matches_count}
            </span>
          </div>

          <Card className="divide-y divide-line p-0 overflow-hidden">
            {refereeAssignments.length > 0 ? (
              refereeAssignments.map((asg) => {
                const m = asg.match;
                return (
                  <div
                    key={asg.id}
                    className="p-4 flex items-center justify-between hover:bg-canvas/40 transition-colors"
                  >
                    <div>
                      <h4 className="text-[15px] font-semibold text-ink">
                        {m ? `${m.home_team.name} vs ${m.away_team.name}` : "League Match"}
                      </h4>
                      <p className="text-[12px] text-ink-muted mt-0.5">
                        {m?.date || "Sat 22 Nov 2026"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={asg.status} />
                      <span className="text-[14px] font-bold text-ink">
                        {asg.indemnity} MAD
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-[13px] text-ink-muted text-center">
                No matches recorded yet.
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
