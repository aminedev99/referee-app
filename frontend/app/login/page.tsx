"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("y.elamrani@mail.ma");
  const [password, setPassword] = useState("Referee12345!");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      await login(formData);
      toast.success("Signed in successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please check credentials.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const setAdminDemo = () => {
    setEmail("admin@referee.local");
    setPassword("Admin12345!");
  };

  const setRefereeDemo = () => {
    setEmail("referee@referee.local");
    setPassword("Referee12345!");
  };

  return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="p-6 md:p-8 flex flex-col items-center">
          {/* Basketball Icon */}
          <div className="w-14 h-14 rounded-full bg-[#FFF1E8] border border-brand/20 flex items-center justify-center text-brand mb-4">
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EA580C"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l4.24 4.24" />
              <path d="M14.83 14.83l4.24 4.24" />
              <path d="M14.83 9.17l4.24-4.24" />
              <path d="M4.93 19.07l4.24-4.24" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          <h1 className="text-[22px] font-bold text-ink text-center tracking-tight">
            Referee Manager
          </h1>
          <p className="text-[14px] text-ink-muted text-center mt-1 mb-6">
            Basketball Official Management
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@mail.ma"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••••••••"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer hover:text-ink transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
              loading={loading}
              className="mt-2"
            >
              Sign in
            </Button>
          </form>

          {/* Quick Demo Switchers */}
          <div className="w-full flex items-center justify-center gap-2 mt-4 pt-3 border-t border-line text-[12px]">
            <span className="text-ink-muted">Quick test:</span>
            <button
              type="button"
              onClick={setAdminDemo}
              className="text-brand font-medium hover:underline cursor-pointer"
            >
              Admin
            </button>
            <span className="text-line">•</span>
            <button
              type="button"
              onClick={setRefereeDemo}
              className="text-brand font-medium hover:underline cursor-pointer"
            >
              Referee
            </button>
          </div>

          <p className="text-[12px] text-ink-muted text-center mt-4 leading-tight">
            Contact the administration if you forgot your password
          </p>
        </Card>
      </div>
    </main>
  );
}
