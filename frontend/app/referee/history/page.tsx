"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Assignment } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { AssignmentCard } from "@/components/AssignmentCard";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";

export default function RefereeHistoryPage() {
  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Assignment[]>({
    queryKey: ["me-assignments"],
    queryFn: () => api.getMeAssignments(),
  });

  const historyList = assignments.filter((a) => a.status !== "pending");

  return (
    <>
      <Navbar title="History" />

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-4">
        {isLoading ? (
          <CardListSkeleton count={3} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : historyList.length === 0 ? (
          <EmptyState message="No past assignments yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {historyList.map((asg) => (
              <AssignmentCard
                key={asg.id}
                assignment={asg}
                isRefereeView
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
