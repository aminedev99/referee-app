"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Assignment } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { Tabs } from "@/components/ui/Tabs";
import { AssignmentCard } from "@/components/AssignmentCard";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function RefereeAssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed" | "past">("pending");
  const [refuseTarget, setRefuseTarget] = useState<Assignment | null>(null);
  const [refusalReason, setRefusalReason] = useState("");

  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Assignment[]>({
    queryKey: ["me-assignments"],
    queryFn: () => api.getMeAssignments(),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.confirmAssignment(id),
    onSuccess: () => {
      toast.success("Assignment confirmed successfully");
      queryClient.invalidateQueries({ queryKey: ["me-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
      setRefuseTarget(null);
      setRefusalReason("");
      queryClient.invalidateQueries({ queryKey: ["me-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to refuse assignment");
    },
  });

  const pendingList = assignments.filter((a) => a.status === "pending");
  const confirmedList = assignments.filter(
    (a) => a.status === "confirmed" && !a.id.includes("past")
  );
  const pastList = assignments.filter(
    (a) => a.status === "refused" || a.id.includes("past")
  );

  const currentList =
    activeTab === "pending"
      ? pendingList
      : activeTab === "confirmed"
      ? confirmedList
      : pastList;

  const handleOpenRefuse = (id: string) => {
    const target = assignments.find((a) => a.id === id);
    if (target) {
      setRefuseTarget(target);
      setRefusalReason("");
    }
  };

  const handleConfirmRefuse = () => {
    if (!refuseTarget) return;
    refuseMutation.mutate({
      id: refuseTarget.id,
      reason: refusalReason.trim(),
    });
  };

  const tabsConfig = [
    { id: "pending", label: "To respond", count: pendingList.length },
    { id: "confirmed", label: "Confirmed", count: confirmedList.length },
    { id: "past", label: "Past" },
  ];

  return (
    <>
      <Navbar title="Assignments" />

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-4">
        {/* Tab switcher */}
        <Tabs
          items={tabsConfig}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as "pending" | "confirmed" | "past")}
        />

        {/* List Content */}
        {isLoading ? (
          <CardListSkeleton count={3} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : currentList.length === 0 ? (
          <EmptyState
            message={
              activeTab === "pending"
                ? "No pending assignments to respond to."
                : activeTab === "confirmed"
                ? "No confirmed upcoming matches."
                : "No past match history."
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {currentList.map((asg) => (
              <AssignmentCard
                key={asg.id}
                assignment={asg}
                isRefereeView
                onConfirm={(id) => confirmMutation.mutate(id)}
                onRefuse={handleOpenRefuse}
                isConfirming={
                  confirmMutation.isPending && confirmMutation.variables === asg.id
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* Refuse Modal / Bottom Sheet (Screen 04) */}
      <Modal
        isOpen={!!refuseTarget}
        onClose={() => setRefuseTarget(null)}
        title="Refuse assignment"
        subtitle={
          refuseTarget?.match
            ? `${refuseTarget.match.home_team.name} vs ${refuseTarget.match.away_team.name}, ${refuseTarget.match.date}`
            : undefined
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          <Field label="Reason (optional)" htmlFor="refusal-reason">
            <Textarea
              id="refusal-reason"
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
              onClick={handleConfirmRefuse}
            >
              Refuse assignment
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              disabled={refuseMutation.isPending}
              onClick={() => setRefuseTarget(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
