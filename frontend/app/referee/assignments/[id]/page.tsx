"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isRefuseOpen, setIsRefuseOpen] = useState(false);
  const [refusalReason, setRefusalReason] = useState("");

  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Assignment[]>({
    queryKey: ["me-assignments"],
    queryFn: () => api.getMeAssignments(),
  });

  const assignment = assignments.find((a) => a.id === params.id);
  const match = assignment?.match;

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.confirmAssignment(id),
    onSuccess: () => {
      toast.success("Assignment confirmed successfully");
      queryClient.invalidateQueries({ queryKey: ["me-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["me-stats"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to confirm assignment");
    },
  });

  const refuseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.refuseAssignment(id, reason),
    onSuccess: () => {
      toast.success("Assignment refused");
      setIsRefuseOpen(false);
      queryClient.invalidateQueries({ queryKey: ["me-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      router.push("/referee");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to refuse assignment");
    },
  });

  if (isLoading) {
    return (
      <>
        <Navbar title="Assignment" backHref="/referee" />
        <main className="max-w-xl mx-auto w-full p-4 flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-[12px]" />
        </main>
      </>
    );
  }

  if (isError || !assignment) {
    return (
      <>
        <Navbar title="Assignment" backHref="/referee" />
        <main className="max-w-xl mx-auto w-full p-4">
          <ErrorState
            message="Assignment could not be found."
            onRetry={() => refetch()}
          />
        </main>
      </>
    );
  }

  // Format date e.g. "Sat 22 Nov 2026"
  let formattedDate = match?.date || "";
  try {
    if (match?.date) {
      const d = new Date(match.date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-GB", {
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

  return (
    <>
      <Navbar title="Assignment" backHref="/referee" />

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-4 pb-24">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <StatusBadge status={assignment.status} />
          <span className="text-[13px] font-medium text-ink-muted">
            Match #{match?.match_number || "2026-88"}
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
            <span className="font-medium text-ink">{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Time</span>
            <span className="font-medium text-ink">{match?.time || "18:30"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">City</span>
            <span className="font-medium text-ink">{match?.city || "Casablanca"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Venue</span>
            <span className="font-medium text-ink">{match?.venue || "Salle Mohammed V"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Division</span>
            <span className="font-medium text-ink">{match?.division || "1DV"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Category</span>
            <span className="font-medium text-ink">{match?.category || "Men"}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px]">
            <span className="text-ink-muted">Function</span>
            <span className="font-medium text-ink">{assignment.referee_function}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 text-[14px] bg-canvas/30">
            <span className="font-medium text-ink">Indemnity</span>
            <span className="text-[16px] font-bold text-ink">
              {assignment.indemnity} MAD
            </span>
          </div>
        </Card>

        {/* Receipt Section (Screen 05) */}
        {assignment.status === "confirmed" && (
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <FileText size={18} strokeWidth={1.75} className="text-brand" />
              <h3 className="text-[16px] font-semibold text-ink">Receipt</h3>
            </div>
            <p className="text-[13px] text-ink-muted">
              {assignment.receipt
                ? `Receipt No. ${assignment.receipt.receipt_number}, issued ${assignment.receipt.issued_at}`
                : "Receipt No. 2026-0148, issued 16 Nov 2026"}
            </p>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={async () => {
                try {
                  toast.info("Downloading receipt PDF...");
                  await api.downloadReceiptPdf(
                    assignment.id,
                    `recu_${assignment.receipt?.receipt_number || assignment.id}.pdf`
                  );
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Failed to download receipt";
                  toast.error(msg);
                }
              }}
            >
              <Download size={16} strokeWidth={1.75} className="mr-2" />
              Download PDF
            </Button>
          </Card>
        )}

        {/* Refused message if refused */}
        {assignment.status === "refused" && assignment.refusal_reason && (
          <div className="bg-[#FDECEC] border border-danger/20 rounded-[12px] p-4 text-[14px] text-danger">
            <span className="font-semibold">Reason for refusal: </span>
            {assignment.refusal_reason}
          </div>
        )}

        {/* Action bar for pending state */}
        {assignment.status === "pending" && (
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line p-4 flex items-center gap-3 z-30 max-w-xl mx-auto">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setIsRefuseOpen(true)}
              disabled={confirmMutation.isPending}
            >
              Refuse
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              loading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(assignment.id)}
            >
              Confirm
            </Button>
          </div>
        )}
      </main>

      {/* Refuse sheet (Screen 04) */}
      <Modal
        isOpen={isRefuseOpen}
        onClose={() => setIsRefuseOpen(false)}
        title="Refuse assignment"
        subtitle={
          match
            ? `${match.home_team.name} vs ${match.away_team.name}, ${formattedDate}`
            : undefined
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          <Field label="Reason (optional)" htmlFor="refuse-reason-modal">
            <Textarea
              id="refuse-reason-modal"
              placeholder="Tell the administration why you cannot attend"
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
              Refuse assignment
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              disabled={refuseMutation.isPending}
              onClick={() => setIsRefuseOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
