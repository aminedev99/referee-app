"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Assignment } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { Tabs } from "@/components/ui/Tabs";
import { AssignmentCard } from "@/components/AssignmentCard";
import { AssignmentTable } from "@/components/AssignmentTable";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function AdminAssignmentsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Assignment[]>({
    queryKey: ["admin-assignments"],
    queryFn: () => api.getAssignments(),
  });

  const receiptMutation = useMutation({
    mutationFn: (asgId: string) => api.createReceipt(asgId),
    onSuccess: () => {
      toast.success("Receipt generated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate receipt");
    },
  });

  const handleDownloadReceipt = async (id: string) => {
    try {
      toast.info("Downloading receipt PDF...");
      await api.downloadReceiptPdf(id, `recu_${id}.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download receipt";
      toast.error(msg);
    }
  };

  const pendingCount = assignments.filter((a) => a.status === "pending").length;
  const confirmedCount = assignments.filter((a) => a.status === "confirmed").length;
  const refusedCount = assignments.filter((a) => a.status === "refused").length;

  const filteredAssignments = assignments.filter((a) => {
    if (activeTab === "all") return true;
    return a.status === activeTab;
  });

  const tabsConfig = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "confirmed", label: "Confirmed", count: confirmedCount },
    { id: "refused", label: "Refused", count: refusedCount },
  ];

  return (
    <>
      <Navbar title="Assignments" />

      <main className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-4 flex flex-col gap-4">
        <div className="hidden md:flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-ink">Assignments</h2>
        </div>

        {/* Status Tabs */}
        <Tabs
          items={tabsConfig}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />

        {/* List Content */}
        {isLoading ? (
          <CardListSkeleton count={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : filteredAssignments.length === 0 ? (
          <EmptyState message="No assignments found for this filter" />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredAssignments.map((asg) => (
                <AssignmentCard
                  key={asg.id}
                  assignment={asg}
                  isRefereeView={false}
                  onGenerateReceipt={(id) => receiptMutation.mutate(id)}
                  onDownloadReceipt={(id) => handleDownloadReceipt(id)}
                />
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <AssignmentTable
                assignments={filteredAssignments}
                onGenerateReceipt={(id) => receiptMutation.mutate(id)}
                onDownloadReceipt={(id) => handleDownloadReceipt(id)}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}
