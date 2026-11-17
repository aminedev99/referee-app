"use client";

import React, { useState } from "react";
import { Phone, Mail, LogOut, Lock, User as UserIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Referee } from "@/lib/types";
import { formatPhone } from "@/lib/format";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

function RefereeProfileContent({ profile }: { profile: Referee }) {
  const { logout, refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(formatPhone(profile.phone));

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name?: string; phone?: string }) => api.updateAuthMe(data),
    onSuccess: async () => {
      toast.success("Profile updated successfully");
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ["referee-profile"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to change password");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfileMutation.mutate({
      full_name: name.trim(),
      phone: phone.trim(),
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const initials = (profile.name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RF";

  const displayPhone = formatPhone(profile.phone);
  const displayLicense = profile.license_number?.trim() || "Not provided";
  const displayEmail = profile.email?.trim() || "Not provided";

  return (
    <main className="max-w-xl mx-auto w-full px-4 pt-6 pb-24 flex flex-col gap-6">
      {/* Profile Header (Reads ONLY from API) */}
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#FFF1E8] border border-brand/20 text-brand text-[24px] font-bold flex items-center justify-center mb-3">
          {initials}
        </div>
        <h2 className="text-[20px] font-bold text-ink tracking-tight">
          {profile.name || "Not provided"}
        </h2>
        <p className="text-[13px] text-ink-muted mt-0.5">
          License {displayLicense} • {profile.category || "National Referee"}
        </p>

        <div className="flex items-center gap-4 text-[13px] text-ink-muted mt-3">
          <span className="flex items-center gap-1.5">
            <Phone size={14} strokeWidth={1.75} />
            {displayPhone}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Mail size={14} strokeWidth={1.75} />
            {displayEmail}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total matches" value={profile.matches_count} />
        <StatCard label="Acceptance rate" value={`${profile.acceptance_rate}%`} />
      </div>

      {/* Read-only Official Info */}
      <Card className="p-4 flex flex-col gap-3">
        <h3 className="text-[14px] font-semibold text-ink">Official Credentials</h3>
        <div className="flex items-center justify-between text-[13px] py-1 border-b border-line">
          <span className="text-ink-muted">Email address</span>
          <span className="font-medium text-ink">{displayEmail}</span>
        </div>
        <div className="flex items-center justify-between text-[13px] py-1 border-b border-line">
          <span className="text-ink-muted">License number</span>
          <span className="font-medium text-ink">{displayLicense}</span>
        </div>
        <p className="text-[11px] text-ink-muted italic">
          Email and license number are managed by league administration.
        </p>
      </Card>

      {/* Editable Profile form */}
      <Card className="p-4">
        <h3 className="text-[14px] font-semibold text-ink mb-3">Personal Details</h3>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3.5">
          <Field label="Full name" htmlFor="ref-name" required>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <Input
                id="ref-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="pl-9"
                required
              />
            </div>
          </Field>

          <Field label="Phone number" htmlFor="ref-phone" required>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <Input
                id="ref-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="pl-9"
                required
              />
            </div>
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={updateProfileMutation.isPending}
            disabled={!name.trim() || !phone.trim()}
            className="mt-1"
          >
            Save details
          </Button>
        </form>
      </Card>

      {/* Change Password Card */}
      <Card className="p-4">
        <h3 className="text-[14px] font-semibold text-ink mb-3">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3.5">
          <Field label="Current password" htmlFor="cur-pw" required>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <Input
                id="cur-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-9"
                required
              />
            </div>
          </Field>

          <Field label="New password (min 8 chars)" htmlFor="new-pw" required>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-9"
                required
              />
            </div>
          </Field>

          <Field label="Confirm new password" htmlFor="conf-pw" required>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <Input
                id="conf-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-9"
                required
              />
            </div>
          </Field>

          <Button
            type="submit"
            variant="secondary"
            size="md"
            loading={changePasswordMutation.isPending}
            disabled={newPassword.length < 8 || newPassword !== confirmPassword}
            className="mt-1"
          >
            Update password
          </Button>
        </form>
      </Card>

      {/* Sign Out Button */}
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={logout}
        className="text-danger hover:text-danger hover:bg-danger-tint border-danger/20"
      >
        <LogOut size={18} strokeWidth={1.75} className="mr-2" />
        Sign out
      </Button>
    </main>
  );
}

export default function RefereeProfilePage() {
  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery<Referee>({
    queryKey: ["referee-profile"],
    queryFn: () => api.getMeProfile(),
  });

  if (isLoading) {
    return (
      <>
        <Navbar title="Profile" />
        <main className="max-w-xl mx-auto w-full px-4 pt-6 flex flex-col gap-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-40 w-full rounded-[12px]" />
        </main>
      </>
    );
  }

  if (isError || !profile) {
    return (
      <>
        <Navbar title="Profile" />
        <main className="max-w-xl mx-auto w-full px-4 pt-6">
          <ErrorState message="Could not load profile" onRetry={() => refetch()} />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar title="Profile" />
      <RefereeProfileContent key={profile.id} profile={profile} />
    </>
  );
}
