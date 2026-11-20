"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  MapPin,
  Edit2,
  XCircle,
  Bell,
  Trash2,
  FileText,
  Download,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Match, Assignment } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

const functionTranslations: Record<string, string> = {
  "1 er arbitre": "1 er arbitre",
  "2 ème arbitre": "2 ème arbitre",
  "1er arbitre": "1 er arbitre",
  "2ème arbitre": "2 ème arbitre",
  "Marqueur": "Marqueur",
  "Aide marqueur": "Aide marqueur",
  "Opérateur 24s": "Opérateur 24s",
  "Chronométreur": "Chronométreur",
  "Arbitre principal 1": "1 er arbitre",
  "Arbitre principal 2": "2 ème arbitre",
  "Main referee": "1 er arbitre",
  "Second referee": "2 ème arbitre",
  "Scorer": "Marqueur",
  "Timekeeper": "Chronométreur",
  "24s operator": "Opérateur 24s",
  "Arbitre principal": "1 er arbitre",
  "Second arbitre": "2 ème arbitre",
};

export default function AdminMatchDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  const {
    data: match,
    isLoading,
    isError,
    refetch,
  } = useQuery<Match>({
    queryKey: ["admin-match", params.id],
    queryFn: () => api.getMatchById(params.id),
  });

  const cancelMatchMutation = useMutation({
    mutationFn: () => api.cancelMatch(params.id),
    onSuccess: () => {
      toast.success("Le match a été annulé");
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-match", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Échec de l'annulation du match");
    },
  });

  const remindMutation = useMutation({
    mutationFn: (asgId: string) => api.remindAssignment(asgId),
    onSuccess: () => {
      toast.success("Rappel envoyé à l'arbitre");
      queryClient.invalidateQueries({ queryKey: ["admin-match", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Échec de l'envoi du rappel");
    },
  });

  const deleteAsgMutation = useMutation({
    mutationFn: (asgId: string) => api.deleteAssignment(asgId),
    onSuccess: () => {
      toast.success("Désignation supprimée");
      setAssignmentToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-match", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Échec de la suppression de la désignation");
    },
  });

  const generateReceiptMutation = useMutation({
    mutationFn: (asgId: string) => api.createReceipt(asgId),
    onSuccess: () => {
      toast.success("Reçu généré avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin-match", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Échec de la génération du reçu");
    },
  });

  if (isLoading) {
    return (
      <>
        <Navbar title="Détails du match" backHref="/admin/matches" />
        <main className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-[12px]" />
          <Skeleton className="h-40 w-full rounded-[12px]" />
        </main>
      </>
    );
  }

  if (isError || !match) {
    return (
      <>
        <Navbar title="Détails du match" backHref="/admin/matches" />
        <main className="max-w-2xl mx-auto w-full p-4">
          <ErrorState message="Impossible de charger les détails du match" onRetry={() => refetch()} />
        </main>
      </>
    );
  }

  const isCancelled = match.status === "cancelled";
  const assignments = match.assignments || [];

  return (
    <>
      <Navbar title={match.match_number || "Match"} backHref="/admin/matches" />

      <main className="max-w-2xl mx-auto w-full px-4 pt-4 pb-20 flex flex-col gap-5">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-ink-muted">
              {match.match_number}
            </span>
            {isCancelled && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-line text-ink-muted border border-line">
                Annulé
              </span>
            )}
          </div>

          {!isCancelled && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/matches/${match.id}/edit`}>
                <Button variant="secondary" size="md">
                  <Edit2 size={14} strokeWidth={1.75} className="mr-1.5" />
                  Modifier
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="md"
                className="text-danger hover:bg-danger-tint border-danger/30"
                onClick={() => setShowCancelConfirm(true)}
              >
                <XCircle size={14} strokeWidth={1.75} className="mr-1.5" />
                Annuler le match
              </Button>
            </div>
          )}
        </div>

        {/* Match Info Card */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex flex-col">
              <h2 className="text-[20px] font-bold text-ink">
                {match.home_team.name} vs {match.away_team.name}
              </h2>
              <span className="text-[13px] text-ink-muted mt-0.5">
                {match.division} • {match.category === "Men" ? "Hommes" : match.category === "Women" ? "Femmes" : match.category}{match.gender ? ` • ${match.gender}` : ""}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] text-ink">
            <div className="flex items-center gap-2 text-ink-muted">
              <Calendar size={16} strokeWidth={1.75} className="text-brand shrink-0" />
              <span>{match.date}</span>
            </div>
            <div className="flex items-center gap-2 text-ink-muted">
              <Clock size={16} strokeWidth={1.75} className="text-brand shrink-0" />
              <span>{match.time}</span>
            </div>
            <div className="flex items-center gap-2 text-ink-muted md:col-span-2">
              <MapPin size={16} strokeWidth={1.75} className="text-brand shrink-0" />
              <span>
                {match.venue}, {match.city}
              </span>
            </div>
          </div>
        </Card>

        {/* Assignments Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h3 className="text-[17px] font-semibold text-ink">Officiels désignés</h3>
            </div>
            <span className="text-[12px] font-semibold bg-canvas text-ink-muted px-2 py-0.5 rounded-full">
              {assignments.length} désigné(s)
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {assignments.length === 0 ? (
              <Card className="p-6 text-center text-ink-muted text-[14px]">
                Aucun arbitre désigné pour ce match.
              </Card>
            ) : (
              assignments.map((asg) => {
                const hasReceipt = Boolean(asg.receipt);
                const translatedFn = functionTranslations[asg.referee_function] || asg.referee_function;

                return (
                  <Card key={asg.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/referees/${asg.referee_id}`}
                            className="text-[15px] font-bold text-ink hover:text-brand transition-colors truncate"
                          >
                            {asg.referee?.name || "Officiel"}
                          </Link>
                          {asg.referee?.license_number && (
                            <span className="text-[12px] text-ink-muted">
                              ({asg.referee.license_number})
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-ink-muted mt-0.5">
                          {translatedFn} • Frais partagés ({match.home_team?.name || "Home"} & {match.away_team?.name || "Away"})
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          {asg.needs_attention && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-danger-tint text-danger border border-danger/20 animate-pulse">
                              Sans réponse
                            </span>
                          )}
                          <StatusBadge status={asg.status} />
                        </div>
                        <span className="text-[14px] font-bold text-ink">
                          {asg.indemnity} MAD
                        </span>
                      </div>
                    </div>

                    {/* Refusal Reason */}
                    {asg.status === "refused" && asg.refusal_reason && (
                      <div className="p-2.5 bg-danger-tint/50 border border-danger/20 rounded-[8px] text-[12px] text-danger flex items-start gap-1.5">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>Motif : {asg.refusal_reason}</span>
                      </div>
                    )}

                    {/* Per-Assignment Action Buttons */}
                    {!isCancelled && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
                        {asg.status === "pending" && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            loading={remindMutation.isPending}
                            onClick={() => remindMutation.mutate(asg.id)}
                          >
                            <Bell size={13} strokeWidth={1.75} className="mr-1" />
                            Rappeler
                          </Button>
                        )}

                        {!hasReceipt && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            className="text-danger hover:bg-danger-tint"
                            onClick={() => setAssignmentToDelete(asg)}
                          >
                            <Trash2 size={13} strokeWidth={1.75} className="mr-1" />
                            Supprimer
                          </Button>
                        )}

                        {asg.status === "confirmed" && !hasReceipt && (
                          <Button
                            type="button"
                            variant="primary"
                            size="md"
                            loading={generateReceiptMutation.isPending}
                            onClick={() => generateReceiptMutation.mutate(asg.id)}
                          >
                            <FileText size={13} strokeWidth={1.75} className="mr-1" />
                            Générer le reçu
                          </Button>
                        )}

                        {hasReceipt && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={() =>
                              api.downloadReceiptPdf(
                                asg.id,
                                `recu_${asg.receipt?.number || asg.receipt?.receipt_number}.pdf`
                              )
                            }
                          >
                            <Download size={13} strokeWidth={1.75} className="mr-1" />
                            Télécharger le reçu ({asg.receipt?.number || asg.receipt?.receipt_number})
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Cancel Match Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={async () => {
          await cancelMatchMutation.mutateAsync();
        }}
        title="Annuler ce match ?"
        subtitle="Tous les arbitres désignés seront informés et les désignations seront verrouillées."
        confirmLabel="Oui, annuler le match"
        isDestructive={true}
        isLoading={cancelMatchMutation.isPending}
      />

      {/* Remove Assignment Dialog */}
      <ConfirmDialog
        isOpen={Boolean(assignmentToDelete)}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={async () => {
          if (assignmentToDelete) {
            await deleteAsgMutation.mutateAsync(assignmentToDelete.id);
          }
        }}
        title="Supprimer la désignation ?"
        subtitle={`Cela annulera la convocation de ${assignmentToDelete?.referee?.name} pour ce match.`}
        confirmLabel="Supprimer la désignation"
        isDestructive={true}
        isLoading={deleteAsgMutation.isPending}
      />
    </>
  );
}
