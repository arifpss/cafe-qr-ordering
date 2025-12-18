import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, apiPost } from "./api";
import type { UserProfile } from "./types";

interface RegisterResponse {
  user: UserProfile;
  tempPassword: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  registerCustomer: (payload: { name: string; email?: string; phone: string }) => Promise<RegisterResponse>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await apiFetch<{ user: UserProfile | null }>("/api/auth/me");
      setUser(data.user ?? null);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (identifier: string, password: string) => {
    const data = await apiPost<{ user: UserProfile }>("/api/auth/login", { identifier, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await apiPost("/api/auth/logout", {});
    setUser(null);
  };

  const registerCustomer = async (payload: { name: string; email?: string; phone: string }) => {
    const data = await apiPost<RegisterResponse>("/api/auth/register-customer", payload);
    setUser(data.user);
    return data;
  };

  const value = useMemo(
    () => ({ user, loading, refresh, login, logout, registerCustomer }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
