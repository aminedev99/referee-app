"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { RefereeStats } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";

export default function RefereeStatsPage() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<RefereeStats>({
    queryKey: ["me-stats"],
    queryFn: () => api.getMeStats(),
  });

  return (
    <>
      <Navbar title="Statistiques" />

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[12px]" />
            ))}
          </div>
        ) : isError || !stats ? (
          <ErrorState message="Impossible de charger les statistiques" onRetry={() => refetch()} />
        ) : (
          <>
            {/* 2x2 Stat Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total désigné" value={stats.total_assigned} />
              <StatCard label="Confirmés" value={stats.confirmed} highlight="success" />
              <StatCard label="Refusés" value={stats.refused} highlight="danger" />
              <StatCard
                label="Taux d'acceptation"
                value={`${stats.acceptance_rate}%`}
                highlight="brand"
              />
            </div>

            {/* Past Matches Section */}
            <div className="flex flex-col gap-3">
              <h2 className="text-[18px] font-semibold text-ink">Matchs passés</h2>
              <Card className="divide-y divide-line p-0 overflow-hidden">
                {stats.past_matches && stats.past_matches.length > 0 ? (
                  stats.past_matches.map((pm) => (
                    <div
                      key={pm.id}
                      className="p-4 flex items-center justify-between hover:bg-canvas/40 transition-colors"
                    >
                      <div>
                        <h4 className="text-[15px] font-semibold text-ink">
                          {pm.home_team} vs {pm.away_team}
                        </h4>
                        <p className="text-[12px] text-ink-muted mt-0.5">
                          {pm.date} • {pm.division}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={pm.status} />
                        <span className="text-[14px] font-bold text-ink">
                          {pm.indemnity} MAD
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-[14px] text-ink-muted">
                    Aucun match passé répertorié.
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  );
}
