"use client";

import React, { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Team, CreateTeamInput } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const {
    data: teams = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Team[]>({
    queryKey: ["admin-teams"],
    queryFn: () => api.getTeams(),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateTeamInput) => api.createTeam(input),
    onSuccess: () => {
      toast.success("Team added successfully");
      setIsSheetOpen(false);
      setName("");
      setCity("");
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add team");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateTeamInput> }) =>
      api.updateTeam(id, input),
    onSuccess: () => {
      toast.success("Team updated successfully");
      setIsSheetOpen(false);
      setEditingTeam(null);
      setName("");
      setCity("");
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update team");
    },
  });

  const openCreate = () => {
    setEditingTeam(null);
    setName("");
    setCity("");
    setIsSheetOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setCity(team.city);
    setIsSheetOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      toast.error("Please fill in both name and city");
      return;
    }
    if (editingTeam) {
      updateMutation.mutate({
        id: editingTeam.id,
        input: { name: name.trim(), city: city.trim() },
      });
    } else {
      createMutation.mutate({ name: name.trim(), city: city.trim() });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Navbar title="Teams" backHref="/admin" />

      <main className="max-w-2xl mx-auto w-full px-4 md:px-6 pt-4 flex flex-col gap-4">
        <div className="hidden md:flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-ink">Teams</h2>
          <Button
            variant="primary"
            size="md"
            onClick={openCreate}
          >
            <Plus size={16} strokeWidth={1.75} className="mr-1.5" />
            Add team
          </Button>
        </div>

        {/* Teams List */}
        {isLoading ? (
          <CardListSkeleton count={6} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : teams.length === 0 ? (
          <EmptyState
            message="No teams found"
            actionLabel="Add team"
            onAction={openCreate}
          />
        ) : (
          <Card className="divide-y divide-line p-0 overflow-hidden">
            {teams.map((t) => (
              <div
                key={t.id}
                className="p-4 flex items-center justify-between hover:bg-canvas/50 transition-colors cursor-pointer group"
                onClick={() => openEdit(t)}
              >
                <div>
                  <h4 className="text-[15px] font-semibold text-ink leading-tight">
                    {t.name}
                  </h4>
                  <p className="text-[13px] text-ink-muted mt-0.5">{t.city}</p>
                </div>
                <div className="flex items-center gap-2 text-ink-muted">
                  <span className="text-[12px] opacity-0 group-hover:opacity-100 transition-opacity text-brand">
                    Edit
                  </span>
                  <ChevronRight size={18} strokeWidth={1.75} />
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={openCreate}
          className="md:hidden fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-brand text-surface flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
          aria-label="Add team"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </main>

      {/* Add / Edit Team Sheet */}
      <Modal
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingTeam(null);
        }}
        title={editingTeam ? "Edit team" : "Add team"}
        subtitle={
          editingTeam
            ? "Update basketball club details"
            : "Register a new basketball club to the league"
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pt-1">
          <Field label="Club name" htmlFor="team-name" required>
            <Input
              id="team-name"
              placeholder="e.g. MAS Fès"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="City" htmlFor="team-city" required>
            <Input
              id="team-city"
              placeholder="e.g. Fès"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSaving}
            className="mt-2"
          >
            {editingTeam ? "Save changes" : "Create team"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
