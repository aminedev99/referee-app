"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Trash2, Eye, EyeOff, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { Referee, UpdateRefereeInput } from "@/lib/types";
import { formatPhone } from "@/lib/format";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

function RefereeEditForm({ referee }: { referee: Referee }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [fullName, setFullName] = useState(referee.name || "");
  const [email, setEmail] = useState(referee.email || "");
  const [phone, setPhone] = useState(formatPhone(referee.phone));
  const [license, setLicense] = useState(referee.license_number || "");
  const [isActive, setIsActive] = useState(referee.is_active !== false);

  // Modals state
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [showToggleActiveConfirm, setShowToggleActiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateRefereeInput) => api.updateReferee(referee.id, input),
    onSuccess: () => {
      toast.success("Referee details updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-referees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-referee", referee.id] });
      router.push(`/admin/referees/${referee.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update referee");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (pwd: string) => api.resetRefereePassword(referee.id, pwd),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setShowResetModal(false);
      setNewPassword("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset password");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => (isActive ? api.deactivateReferee(referee.id) : api.activateReferee(referee.id)),
    onSuccess: () => {
      const nextActive = !isActive;
      setIsActive(nextActive);
      toast.success(nextActive ? "Referee activated" : "Referee deactivated");
      setShowToggleActiveConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-referees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-referee", referee.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Action failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteReferee(referee.id),
    onSuccess: () => {
      toast.success("Referee deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-referees"] });
      router.push("/admin/referees");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete referee");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !license.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    updateMutation.mutate({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      license_number: license.trim(),
      is_active: isActive,
    });
  };

  const hasAssignments = (referee.assigned_count ?? 0) > 0 || (referee.matches_count ?? 0) > 0;

  return (
    <>
      <main className="max-w-2xl mx-auto w-full px-4 md:px-6 pt-4 pb-28 flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Main Referee Form Card */}
          <Card className="p-4 md:p-6 flex flex-col gap-4">
            <h3 className="text-[16px] font-semibold text-ink border-b border-line pb-3">
              Official Details
            </h3>

            <Field label="Full name" htmlFor="ref-name" required>
              <Input
                id="ref-name"
                placeholder="e.g. Youssef El Amrani"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </Field>

            <Field label="Email address" htmlFor="ref-email" required>
              <Input
                id="ref-email"
                type="email"
                placeholder="e.g. y.elamrani@mail.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone number" htmlFor="ref-phone" required>
                <Input
                  id="ref-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </Field>

              <Field label="License number" htmlFor="ref-license" required>
                <Input
                  id="ref-license"
                  placeholder="e.g. 1104"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  required
                />
              </Field>
            </div>

            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ink">Active Status</span>
                <span className="text-[12px] text-ink-muted">
                  Inactive referees cannot log in and are excluded from the match assignment picker.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </Card>

          {/* Account Security Card */}
          <Card className="p-4 md:p-6 flex flex-col gap-3">
            <h3 className="text-[16px] font-semibold text-ink border-b border-line pb-3">
              Account Security
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-ink">Reset password</p>
                <p className="text-[12px] text-ink-muted">
                  Issue a new temporary password for this referee
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setNewPassword("");
                  setShowResetModal(true);
                }}
              >
                <KeyRound size={15} strokeWidth={1.75} className="mr-1.5" />
                Reset password
              </Button>
            </div>
          </Card>

          {/* Danger Zone Card */}
          <Card className="p-4 md:p-6 border-danger/30 bg-danger-tint/10 flex flex-col gap-4">
            <h3 className="text-[16px] font-semibold text-danger border-b border-danger/20 pb-3">
              Danger Zone
            </h3>

            <div className="flex items-start justify-between gap-4 border-b border-danger/10 pb-4">
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ink">
                  {isActive ? "Deactivate referee" : "Activate referee"}
                </span>
                <span className="text-[12px] text-ink-muted">
                  {isActive
                    ? "Blocks login and excludes from match pickers while preserving match history."
                    : "Reactivates account and allows new assignments."}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className={isActive ? "text-danger border-danger/30 hover:bg-danger-tint" : "text-success border-success/30"}
                onClick={() => setShowToggleActiveConfirm(true)}
              >
                {isActive ? (
                  <>
                    <UserX size={14} className="mr-1" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck size={14} className="mr-1" />
                    Activate
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ink">Delete referee</span>
                <span className="text-[12px] text-ink-muted">
                  Permanently remove official. Only possible if the referee has zero assignments.
                </span>
                {hasAssignments && (
                  <span className="text-[12px] text-danger font-medium mt-1">
                    Referee has assignments, deactivate instead.
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={hasAssignments || deleteMutation.isPending}
                className="text-danger border-danger/30 hover:bg-danger-tint shrink-0"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} className="mr-1" />
                Delete
              </Button>
            </div>
          </Card>

          {/* Fixed bottom action bar */}
          <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-surface border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3 z-40 shadow-lg">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              loading={updateMutation.isPending}
            >
              Save changes
            </Button>
          </div>
        </form>
      </main>

      {/* Reset Password Sheet */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset referee password"
        subtitle={`Set a new temporary password for ${referee.name}`}
      >
        <div className="flex flex-col gap-4">
          <Field label="New password (min 8 chars)" htmlFor="new-pw" required>
            <Input
              id="new-pw"
              type={showPasswordText ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="cursor-pointer hover:text-ink transition-colors p-1"
                >
                  {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </Field>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={resetPasswordMutation.isPending}
              disabled={newPassword.length < 8}
              onClick={() => resetPasswordMutation.mutate(newPassword)}
            >
              Update password
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              disabled={resetPasswordMutation.isPending}
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate / Activate Confirm Dialog */}
      <ConfirmDialog
        isOpen={showToggleActiveConfirm}
        onClose={() => setShowToggleActiveConfirm(false)}
        onConfirm={async () => {
          await toggleActiveMutation.mutateAsync();
        }}
        title={isActive ? "Deactivate this referee?" : "Activate this referee?"}
        subtitle={
          isActive
            ? "The referee will no longer be able to log in or be assigned to upcoming matches."
            : "The referee will be able to log in and receive new match assignments."
        }
        confirmLabel={isActive ? "Deactivate" : "Activate"}
        isDestructive={isActive}
        isLoading={toggleActiveMutation.isPending}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        title="Permanently delete referee?"
        subtitle="This action cannot be undone. All referee data will be erased."
        confirmLabel="Yes, delete referee"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

export default function AdminRefereeEditPage() {
  const params = useParams<{ id: string }>();

  const {
    data: referee,
    isLoading,
    isError,
    refetch,
  } = useQuery<Referee>({
    queryKey: ["admin-referee", params.id],
    queryFn: () => api.getRefereeById(params.id),
  });

  if (isLoading) {
    return (
      <>
        <Navbar title="Edit referee" backHref={`/admin/referees/${params.id}`} />
        <main className="max-w-2xl mx-auto w-full px-4 md:px-6 pt-4 flex flex-col gap-4">
          <Skeleton className="h-48 w-full rounded-[12px]" />
          <Skeleton className="h-32 w-full rounded-[12px]" />
        </main>
      </>
    );
  }

  if (isError || !referee) {
    return (
      <>
        <Navbar title="Edit referee" backHref="/admin/referees" />
        <main className="max-w-2xl mx-auto w-full px-4 md:px-6 pt-4">
          <ErrorState message="Could not load referee data" onRetry={() => refetch()} />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar title="Edit referee" backHref={`/admin/referees/${params.id}`} />
      <RefereeEditForm key={referee.id} referee={referee} />
    </>
  );
}
