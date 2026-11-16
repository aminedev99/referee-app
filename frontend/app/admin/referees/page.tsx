"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Referee, CreateRefereeInput } from "@/lib/types";
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
      toast.success("Referee created successfully");
      setIsAddOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setLicense("");
      queryClient.invalidateQueries({ queryKey: ["admin-referees"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create referee");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !license) {
      toast.error("Please fill in all required fields");
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
      <Navbar title="Referees" />

      <main className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-4 flex flex-col gap-4">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-ink">Referees</h2>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={16} strokeWidth={1.75} className="mr-1.5" />
            Add referee
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search name or license number"
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
            message="No referees found"
            actionLabel="Add referee"
            onAction={() => setIsAddOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {referees.map((r) => {
              const initials = r.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Link key={r.id} href={`/admin/referees/${r.id}`}>
                  <Card className="hover:border-brand/40 transition-colors p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#FFF1E8] text-brand font-bold text-[14px] flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[15px] font-semibold text-ink truncate">
                          {r.name}
                        </h4>
                        <p className="text-[12px] text-ink-muted truncate">
                          License {r.license_number} • {r.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[13px] font-medium text-ink">
                        {r.matches_count} matches
                      </span>
                      <span className="text-[12px] font-semibold text-success">
                        {r.acceptance_rate}% accepted
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
          aria-label="Add referee"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </main>

      {/* Add Referee Sheet (Screen 14) */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add referee"
        subtitle="Register a new official to the league pool"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 pt-1">
          <Field label="Full name" htmlFor="ref-name" required>
            <Input
              id="ref-name"
              placeholder="e.g. Sara Idrissi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Email" htmlFor="ref-email" required>
            <Input
              id="ref-email"
              type="email"
              placeholder="s.idrissi@mail.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Phone" htmlFor="ref-phone" required>
            <Input
              id="ref-phone"
              placeholder="06 63 45 67 89"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>

          <Field label="License number" htmlFor="ref-license" required>
            <Input
              id="ref-license"
              placeholder="1104"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              required
            />
          </Field>

          <Field label="Temporary password" htmlFor="ref-password">
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
            Create referee
          </Button>
        </form>
      </Modal>
    </>
  );
}
