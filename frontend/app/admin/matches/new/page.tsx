"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CreateMatchInput } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { MatchForm } from "@/components/MatchForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function NewMatchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: teams = [], isLoading: teamsLoading, isError: teamsError, refetch: refetchTeams } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => api.getTeams(),
  });

  const { data: referees = [], isLoading: refsLoading, isError: refsError, refetch: refetchRefs } = useQuery({
    queryKey: ["admin-referees"],
    queryFn: () => api.getReferees(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMatchInput) => api.createMatch(data),
    onSuccess: () => {
      toast.success("Match created and referees assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      router.push("/admin/matches");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create match");
    },
  });

  const isLoading = teamsLoading || refsLoading;
  const isError = teamsError || refsError;

  return (
    <>
      <Navbar title="New match" backHref="/admin/matches" />

      <main className="max-w-xl mx-auto w-full px-4 pt-4">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            message="Could not load teams or referees"
            onRetry={() => {
              refetchTeams();
              refetchRefs();
            }}
          />
        ) : (
          <MatchForm
            teams={teams}
            referees={referees}
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
            isLoading={createMutation.isPending}
          />
        )}
      </main>
    </>
  );
}
