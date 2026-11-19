"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Referee, CreateRefereeInput } from "@/lib/types";
import { formatPhone } from "@/lib/format";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function AdminRefereesPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(() => searchParams.get("add") === "true");
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [password, setPassword] = useState("Ref2026@Temp");

  const {
    data: referees = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Referee[]>({
    queryKey: ["admin-referees", search],
    queryFn: () => api.getReferees(search),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateRefereeInput) => api.createReferee(input),
    onSuccess: () => {
      toast.success("Arbitre créé avec succès");
      setIsAddOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setLicense("");
      queryClient.invalidateQueries({ queryKey: ["admin-referees"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Échec de la création de l'arbitre");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !license) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createMutation.mutate({
      name,
      email,
      phone,
      license_number: license,
      temporary_password: password,
    });
  };

  return (
    <>
      <Navbar title="Arbitres" />

      <main className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-4 flex flex-col gap-4 pb-20">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-ink">Arbitres</h2>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={16} strokeWidth={1.75} className="mr-1.5" />
            Ajouter un arbitre
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Rechercher par nom ou numéro de licence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} strokeWidth={1.75} />}
        />

        {/* List */}
        {isLoading ? (
          <CardListSkeleton count={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : referees.length === 0 ? (
          <EmptyState
            message="Aucun arbitre trouvé"
            actionLabel="Ajouter un arbitre"
            onAction={() => setIsAddOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {referees.map((r) => {
              const initials = (r.name || "")
                .split(" ")
                .map((n) => n[0])
                .filter(Boolean)
                .join("")
                .slice(0, 2)
                .toUpperCase() || "AR";

              const isInactive = r.is_active === false;

              return (
                <Link key={r.id} href={`/admin/referees/${r.id}`}>
                  <Card className="hover:border-brand/40 transition-colors p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#FFF1E8] text-brand font-bold text-[14px] flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[15px] font-semibold text-ink truncate">
                            {r.name || "Non renseigné"}
                          </h4>
                          {isInactive && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-danger-tint text-danger border border-danger/20 shrink-0">
                              Inactif
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-ink-muted truncate">
                          Licence {r.license_number || "Non renseigné"} • {formatPhone(r.phone)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[13px] font-medium text-ink">
                        {r.matches_count} match{r.matches_count > 1 ? "s" : ""}
                      </span>
                      <span className="text-[12px] font-semibold text-success">
                        {r.acceptance_rate}% accepté
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="md:hidden fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-brand text-surface flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
          aria-label="Ajouter un arbitre"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </main>

      {/* Add Referee Sheet */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Ajouter un arbitre"
        subtitle="Enregistrer un nouvel officiel auprès de la ligue"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 pt-1">
          <Field label="Nom complet" htmlFor="ref-name" required>
            <Input
              id="ref-name"
              placeholder="ex. Nom et Prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Email" htmlFor="ref-email" required>
            <Input
              id="ref-email"
              type="email"
              placeholder="arbitre@domaine.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Téléphone" htmlFor="ref-phone" required>
            <Input
              id="ref-phone"
              type="tel"
              inputMode="tel"
              placeholder="06XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>

          <Field label="Numéro de licence" htmlFor="ref-license" required>
            <Input
              id="ref-license"
              placeholder="ex. 1234"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              required
            />
          </Field>

          <Field label="Mot de passe temporaire" htmlFor="ref-password">
            <Input
              id="ref-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="cursor-pointer hover:text-ink transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.75} />
                  ) : (
                    <Eye size={18} strokeWidth={1.75} />
                  )}
                </button>
              }
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={createMutation.isPending}
            className="mt-2"
          >
            Créer l'arbitre
          </Button>
        </form>
      </Modal>
    </>
  );
}
