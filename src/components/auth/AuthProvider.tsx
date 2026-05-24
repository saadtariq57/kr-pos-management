"use client";

import * as React from "react";

import { apiGet, apiPost } from "@/lib/api-client";

export type AuthBranch = {
  id: string;
  name: string;
  city: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  email_verified?: boolean;
  approval_status?: "pending" | "approved";
  branch?: AuthBranch | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ ok: true; user: AuthUser | null }>(
        "/api/auth/me",
      );
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    await apiPost("/api/auth/logout", {});
    setUser(null);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

