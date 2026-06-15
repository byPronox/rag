"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { fetchSession, logout as logoutApi, startLogin } from "@/lib/api/auth";

export interface User {
  email: string;
  groups: string[];
}

interface AuthContextType {
  user: User | null;
  loaded: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (returnTo?: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetchSession();
      setUser(res.authenticated && res.user ? res.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    const onUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [load]);

  const signIn = useCallback((returnTo = "/dashboard") => startLogin(returnTo), []);
  const signOut = useCallback(async () => {
    const { logoutUrl } = await logoutApi();
    setUser(null);
    window.location.assign(logoutUrl);
  }, []);

  const value = useMemo(() => {
    const isCognitoAdmin = user?.groups.includes("Admins") ?? false;

    return {
      user,
      loaded,
      isAuthenticated: user !== null,
      isAdmin: isCognitoAdmin, // Si quieres bloquear el acceso a /admin, pon esto en `false` por defecto
      signIn,
      signOut,
    };
  }, [user, loaded, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}