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
        <Navbar title="Arbitre" backHref="/admin/referees" />
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
        <Navbar title="Arbitre" backHref="/admin/referees" />
        <main className="max-w-xl mx-auto w-full p-4">
          <ErrorState message="Impossible de charger le profil de l'arbitre" onRetry={() => refetch()} />
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
    .toUpperCase() || "AR";

  const displayPhone = formatPhone(referee.phone);
  const displayLicense = referee.license_number?.trim() || "Non renseigné";
  const displayEmail = referee.email?.trim() || "Non renseigné";
  const isInactive = referee.is_active === false;

  return (
    <>
      <Navbar title={referee.name || "Arbitre"} backHref="/admin/referees" />

      <main className="max-w-xl mx-auto w-full px-4 pt-6 pb-20 flex flex-col gap-6">
        {/* Profile Card Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#FFF1E8] border border-brand/20 text-brand text-[24px] font-bold flex items-center justify-center mb-3">
              {initials}
            </div>
            {isInactive && (
              <span className="absolute bottom-2 right-0 bg-danger text-surface text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full">
                Inactif
              </span>
            )}
          </div>

          <h2 className="text-[22px] font-bold text-ink tracking-tight flex items-center gap-2">
            <span>{referee.name || "Non renseigné"}</span>
            {isInactive && (
              <span className="text-[12px] font-medium bg-danger-tint text-danger px-2 py-0.5 rounded-full border border-danger/20">
                Inactif
              </span>
            )}
          </h2>

          <p className="text-[13px] text-ink-muted mt-0.5">
            Civilité : <strong className="text-ink font-semibold">{referee.gender === "Femme" ? "MS" : "MR"}</strong> ({referee.gender || "Homme"}) • Licence {displayLicense} • {referee.category || "Arbitre National"}
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

          <div className="mt-4">
            <Link
              href={`/admin/referees/${params.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-line bg-surface text-[13px] font-medium text-ink hover:border-brand/40 transition-colors"
            >
              <Edit2 size={14} strokeWidth={1.75} />
              <span>Modifier le profil</span>
            </Link>
          </div>
        </div>

        {/* 3 Stat Cards in Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Désigné(s)" value={referee.assigned_count ?? referee.matches_count} />
          <StatCard
            label="Confirmé(s)"
            value={referee.confirmed_count ?? Math.round((referee.matches_count * referee.acceptance_rate) / 100)}
            highlight="success"
          />
          <StatCard
            label="Refusé(s)"
            value={referee.refused_count ?? Math.max(0, referee.matches_count - Math.round((referee.matches_count * referee.acceptance_rate) / 100))}
            highlight="danger"
          />
        </div>

        {/* Match History Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h3 className="text-[18px] font-semibold text-ink">Historique des matchs</h3>
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
                        {m ? `${m.home_team.name} vs ${m.away_team.name}` : "Match de championnat"}
                      </h4>
                      <p className="text-[12px] text-ink-muted mt-0.5">
                        {m?.date || ""}
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
                Aucun match enregistré pour le moment.
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
