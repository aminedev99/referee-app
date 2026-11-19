"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Assignment } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, DivisionBadge, CategoryBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function RefereeAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isRefuseOpen, setIsRefuseOpen] = useState(false);
  const [refusalReason, setRefusalReason] = useState("");

  const {
    data: singleAssignment,
    isLoading: isLoadingSingle,
    isError: isSingleError,
    refetch,
  } = useQuery<Assignment>({
    queryKey: ["me-assignment", params.id],
    queryFn: () => api.getMeAssignmentById(params.id),
    enabled: !!params.id,
  });

  const {
    data: assignments = [],
  } = useQuery<Assignment[]>({
    queryKey: ["me-assignments"],
    queryFn: () => api.getMeAssignments(),
  });

  const assignment = singleAssignment || assignments.find((a) => a.id === params.id);
  const match = assignment?.match;
  const isLoading = isLoadingSingle && !assignment;

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.confirmAssignment(id),
    onSuccess: () => {
      toast.success("Désignation confirmée avec succès");
      queryClient.invalidateQueries({ queryKey: ["me-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["me-assignment", params.id] });
      queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Échec de la confirmation de la désignation");
    },
  });

  const refuseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.refuseAssignment(id, reason),
    onSuccess: () => {
      toast.success("Désignation refusée");
      setIsRefuseOpen(false);
      queryClient.invalidateQueries({ queryKey: ["me-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["me-assignment", params.id] });
      queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Échec du refus de la désignation");
    },
  });

  if (isLoading) {
    return (
      <>
        <Navbar title="Désignation" backHref="/referee" />
        <main className="max-w-xl mx-auto w-full p-4 flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-[12px]" />
        </main>
      </>
    );
  }

  if ((isSingleError && !assignment) || !assignment) {
    return (
      <>
        <Navbar title="Désignation" backHref="/referee" />
        <main className="max-w-xl mx-auto w-full p-4">
          <ErrorState
            message="Désignation introuvable."
            onRetry={() => refetch()}
          />
        </main>
      </>
    );
  }

  // Format date e.g. "sam. 22 nov. 2026"
  let formattedDate = match?.date || "";
  try {
    if (match?.date) {
      const d = new Date(match.date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    }
  } catch {
    formattedDate = match?.date || "";
  }

  const isCancelled = match?.status === "cancelled";

  // Check 24 hours lock-out
  let matchDateTime: Date | null = null;
  if (match?.date) {
    try {
      const timeStr = match.time || "00:00";
      const fullTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      matchDateTime = new Date(`${match.date}T${fullTime}`);
    } catch {
      matchDateTime = null;
    }
  }

  const now = new Date();
  const isPast = matchDateTime ? matchDateTime.getTime() <= now.getTime() : false;
  const isWithin24h = matchDateTime
    ? matchDateTime.getTime() - now.getTime() < 24 * 3600 * 1000
    : false;

  const functionTranslations: Record<string, string> = {
    "Main referee": "Arbitre principal",
    "Second referee": "Second arbitre",
    "Scorer": "Marqueur",
    "Timekeeper": "Chronométreur",
    "24s operator": "Opérateur 24s",
  };
  const translatedFunction = functionTranslations[assignment.referee_function] || assignment.referee_function;

  return (
    <>
      <Navbar title="Désignation" backHref="/referee" />

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-4 pb-28">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCancelled ? (
              <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                Annulé
              </span>
            ) : (
              <StatusBadge status={assignment.status} />
            )}
            {assignment.needs_attention && !isCancelled && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-danger/10 text-danger border border-danger/20">
                Sans réponse
              </span>
            )}
          </div>
          <span className="text-[13px] font-medium text-ink-muted">
            {match?.match_number ? `Match #${match.match_number}` : ""}
          </span>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-[22px] font-bold text-ink tracking-tight">
            {match ? `${match.home_team.name} vs ${match.away_team.name}` : "Match"}
          </h2>
          {match && (
            <div className="flex items-center gap-2 mt-2">
              <DivisionBadge division={match.division} />
              <CategoryBadge category={match.category} />
            </div>
          )}
        </div>

        {/* Details card */}
        <Card className="divide-y divide-line p-0 overflow-hidden">
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Date</span>
            <span className="font-medium text-ink">{formattedDate || "-"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Heure</span>
            <span className="font-medium text-ink">{match?.time || "-"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Ville</span>
            <span className="font-medium text-ink">{match?.city || "-"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Salle</span>
            <span className="font-medium text-ink">{match?.venue || "-"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Division</span>
            <span className="font-medium text-ink">{match?.division || "-"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Catégorie</span>
            <span className="font-medium text-ink">
              {match?.category === "Men" ? "Hommes" : match?.category === "Women" ? "Femmes" : match?.category || "-"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Fonction</span>
            <span className="font-medium text-ink">{translatedFunction}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px] bg-canvas/30">
            <span className="font-medium text-ink">Indemnité</span>
            <span className="text-[16px] font-bold text-ink">
              {assignment.indemnity} MAD
            </span>
          </div>
        </Card>

        {/* Receipt Section */}
        {assignment.status === "confirmed" && !isCancelled && (
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <FileText size={18} strokeWidth={1.75} className="text-brand" />
              <h3 className="text-[16px] font-semibold text-ink">Reçu</h3>
            </div>
            {assignment.receipt ? (
              <>
                <p className="text-[13px] text-ink-muted">
                  Reçu N° {assignment.receipt.receipt_number}, émis le{" "}
                  {assignment.receipt.issued_at}
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={async () => {
                    try {
                      toast.info("Téléchargement du reçu PDF...");
                      await api.downloadReceiptPdf(
                        assignment.id,
                        `recu_${assignment.receipt?.receipt_number || assignment.id}.pdf`
                      );
                    } catch (err: unknown) {
                      const msg =
                        err instanceof Error ? err.message : "Échec du téléchargement du reçu";
                      toast.error(msg);
                    }
                  }}
                >
                  <Download size={16} strokeWidth={1.75} className="mr-2" />
                  Télécharger le PDF
                </Button>
              </>
            ) : (
              <p className="text-[13px] text-ink-muted">
                Le reçu sera généré par l'administration après confirmation.
              </p>
            )}
          </Card>
        )}

        {/* Refused reason message if refused */}
        {assignment.status === "refused" && assignment.refusal_reason && (
          <div className="bg-[#FDECEC] border border-danger/20 rounded-[12px] p-4 text-[14px] text-danger">
            <span className="font-semibold">Motif du refus : </span>
            {assignment.refusal_reason}
          </div>
        )}

        {/* 24h Lock Notice if already answered and too close to the match */}
        {!isCancelled && !isPast && isWithin24h && assignment.status !== "pending" && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-[12px] text-[13px] text-ink-muted">
            <AlertCircle size={16} className="text-gray-400 shrink-0" />
            <span>Trop proche du match, contactez l'administration</span>
          </div>
        )}

        {/* Action Bar (when not cancelled and not past) */}
        {!isCancelled && !isPast && (
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line p-4 flex items-center gap-3 z-30 max-w-xl mx-auto">
            {assignment.status === "pending" && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={() => setIsRefuseOpen(true)}
                  disabled={confirmMutation.isPending}
                >
                  Refuser
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  loading={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(assignment.id)}
                >
                  Confirmer
                </Button>
              </>
            )}

            {assignment.status === "confirmed" && !isWithin24h && (
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setIsRefuseOpen(true)}
                className="text-danger border-danger/30 hover:bg-danger/10"
              >
                Changer en Refusé
              </Button>
            )}

            {assignment.status === "refused" && !isWithin24h && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate(assignment.id)}
              >
                Changer en Confirmé
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Refuse sheet */}
      <Modal
        isOpen={isRefuseOpen}
        onClose={() => setIsRefuseOpen(false)}
        title={assignment.status === "confirmed" ? "Changer en Refusé" : "Refuser la désignation"}
        subtitle={
          match
            ? `${match.home_team.name} vs ${match.away_team.name}, ${formattedDate}`
            : undefined
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          <Field label="Motif (facultatif)" htmlFor="refuse-reason-modal">
            <Textarea
              id="refuse-reason-modal"
              placeholder="Indiquez à l'administration pourquoi vous ne pouvez pas participer"
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              rows={3}
            />
          </Field>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              loading={refuseMutation.isPending}
              onClick={() =>
                refuseMutation.mutate({
                  id: assignment.id,
                  reason: refusalReason.trim(),
                })
              }
            >
              Confirmer le refus
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              disabled={refuseMutation.isPending}
              onClick={() => setIsRefuseOpen(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
