"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Role, User } from "./types";
import { api, clearStoredToken, getStoredToken, setOnUnauthorizedCallback } from "./api";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;
  login: (formData: FormData | URLSearchParams, nextPath?: string | null) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !!getStoredToken();
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      queryClient.clear();
      setUser(null);
      setRole(null);
    });
  }, [queryClient]);

  const refetchUser = async (): Promise<User | null> => {
    try {
      const u = await api.getMe();
      setUser(u);
      setRole(u.role);
      return u;
    } catch {
      clearStoredToken();
      queryClient.clear();
      setUser(null);
      setRole(null);
      return null;
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refetchUser().finally(() => {
        setLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (formData: FormData | URLSearchParams, nextPath?: string | null) => {
    setLoading(true);
    try {
      const res = await api.login(formData);
      setUser(res.user);
      setRole(res.role);

      // Check nextPath if valid and allowed for this role
      if (nextPath && nextPath.startsWith("/")) {
        if (res.role === "admin" && !nextPath.startsWith("/referee")) {
          router.replace(nextPath);
          return;
        }
        if (res.role === "referee" && !nextPath.startsWith("/admin")) {
          router.replace(nextPath);
          return;
        }
      }

      if (res.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/referee");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    queryClient.clear();
    setUser(null);
    setRole(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
