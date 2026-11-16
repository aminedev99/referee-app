"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CreateMatchInput, Match } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { MatchForm } from "@/components/MatchForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function EditMatchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: match, isLoading: matchLoading, isError: matchError, refetch: refetchMatch } = useQuery<Match>({
    queryKey: ["admin-match", params.id],
    queryFn: () => api.getMatchById(params.id),
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => api.getTeams(),
  });

  const { data: referees = [], isLoading: refsLoading } = useQuery({
    queryKey: ["admin-referees"],
    queryFn: () => api.getReferees(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateMatchInput) => api.updateMatch(params.id, data),
    onSuccess: () => {
      toast.success("Match updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-match", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
      router.push("/admin/matches");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update match");
    },
  });

  const isLoading = matchLoading || teamsLoading || refsLoading;

  return (
    <>
      <Navbar title="Edit match" backHref="/admin/matches" />

      <main className="max-w-xl mx-auto w-full px-4 pt-4">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : matchError || !match ? (
          <ErrorState message="Could not load match details" onRetry={() => refetchMatch()} />
        ) : (
          <MatchForm
            initialData={match}
            teams={teams}
            referees={referees}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync(data);
            }}
            isLoading={updateMutation.isPending}
          />
        )}
      </main>
    </>
  );
}
