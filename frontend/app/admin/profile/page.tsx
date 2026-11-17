"use client";

import React, { useState } from "react";
import { Mail, LogOut, KeyRound, Lock, User as UserIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { User } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

function AdminProfileContent({ user }: { user: User }) {
  const { logout, refetchUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name?: string }) => api.updateAuthMe(data),
    onSuccess: async () => {
      toast.success("Profile updated successfully");
      await refetchUser();
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

  const initials = (user.name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";

  return (
    <main className="max-w-xl mx-auto w-full px-4 pt-6 pb-24 flex flex-col gap-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#FFF1E8] border border-brand/20 text-brand text-[24px] font-bold flex items-center justify-center mb-3">
          {initials}
        </div>
        <h1 className="text-[20px] font-bold text-gray-900">{user.name}</h1>
        <p className="text-[13px] text-gray-500 capitalize">{user.role} Account</p>
      </div>

      {/* Read-Only Account Details */}
      <Card className="p-4 flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold text-gray-900">Account Details</h2>
        <div className="flex items-center gap-3 text-[14px] text-gray-600">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate">{user.email}</span>
          <span className="ml-auto text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Read-only
          </span>
        </div>
      </Card>

      {/* Edit Profile Info Form */}
      <Card className="p-4">
        <h2 className="text-[14px] font-semibold text-gray-900 mb-4">Edit Profile</h2>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <Field label="Full Name" required>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
          </Field>

          <Button
            type="submit"
            disabled={updateProfileMutation.isPending || !name.trim()}
            className="w-full mt-2"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>

      {/* Change Password Card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-brand" />
          <h2 className="text-[14px] font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <Field label="Current Password" required>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="password"
                className="pl-9"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
          </Field>

          <Field label="New Password (min 8 characters)" required>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="password"
                className="pl-9"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </Field>

          <Field label="Confirm New Password" required>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="password"
                className="pl-9"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </Field>

          <Button
            type="submit"
            variant="secondary"
            disabled={
              changePasswordMutation.isPending ||
              !currentPassword ||
              newPassword.length < 8 ||
              newPassword !== confirmPassword
            }
            className="w-full mt-2"
          >
            {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
          </Button>
        </form>
      </Card>

      {/* Logout */}
      <Button
        variant="secondary"
        onClick={() => logout()}
        className="w-full text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </main>
  );
}

export default function AdminProfilePage() {
  const { user, loading: isAuthLoading } = useAuth();

  if (isAuthLoading || !user) {
    return (
      <>
        <Navbar title="Admin Profile" />
        <main className="max-w-xl mx-auto w-full px-4 pt-6 flex flex-col gap-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-40 w-full rounded-[12px]" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar title="Profile" />
      <AdminProfileContent key={user.id} user={user} />
    </>
  );
}
