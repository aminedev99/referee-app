"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      await login(formData, nextPath);
      toast.success("Connexion réussie");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Échec de la connexion. Veuillez vérifier vos identifiants.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l4.24 4.24" />
              <path d="M14.83 9.17l4.24-4.24" />
              <path d="M14.83 14.83l4.24 4.24" />
              <path d="M9.17 14.83L4.93 19.07" />
              <path d="M12 2v20" />
              <path d="M2 12h20" />
            </svg>
          </div>

          <h1 className="text-[24px] font-bold text-ink mb-1">Gestion des Arbitres</h1>
          <p className="text-[14px] text-ink-muted mb-6 text-center">
            Connectez-vous pour accéder à vos convocations et désignations
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                placeholder="nom@mail.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>

            <Field label="Mot de passe" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.75} />
                  ) : (
                    <Eye size={18} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="mt-2"
            >
              Se connecter
            </Button>
          </form>

          <p className="text-[12px] text-ink-muted text-center mt-6 leading-tight">
            Contactez l'administration si vous avez oublié votre mot de passe
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
