"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Role, User } from "./types";
import { api, clearStoredToken, getStoredToken } from "./api";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;
  login: (formData: FormData | URLSearchParams) => Promise<void>;
  logout: () => void;
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

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    api
      .getMe()
      .then((u) => {
        setUser(u);
        setRole(u.role);
      })
      .catch(() => {
        clearStoredToken();
        setUser(null);
        setRole(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (formData: FormData | URLSearchParams) => {
    setLoading(true);
    try {
      const res = await api.login(formData);
      setUser(res.user);
      setRole(res.role);
      if (res.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/referee");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    setRole(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
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
