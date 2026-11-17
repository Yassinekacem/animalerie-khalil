"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "CLIENT" | "ADMIN";
  phone: string | null;
  image: string | null;
};
type Registration = { name: string; email: string; password: string; phone: string | null; sexe: "HOMME" | "FEMME"; image?: string | null; acceptTerms: true };
type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (data: { email: string; password: string; rememberMe: boolean }) => Promise<AuthUser>;
  register: (data: Registration) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    cache: "no-store", credentials: "same-origin",
    ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error("Réponse du serveur incorrecte. Veuillez réessayer."); }
  if (!response.ok) {
    const issues = Array.isArray(data?.issues) ? data.issues.flatMap((issue: { message?: unknown }) => typeof issue.message === "string" ? [issue.message] : []) : [];
    throw new Error([typeof data?.error === "string" ? data.error : "La requête a échoué.", ...issues].join("\n"));
  }
  return data;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const data = await request<{ user: AuthUser | null }>("session");
      if (current === generation.current) { setUser(data.user); setError(""); }
    } catch {
      if (current === generation.current) setError("Impossible de vérifier votre session.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const update = () => { void refresh(); };
    const requestGeneration = generation;
    const initialCheck = window.setTimeout(update, 0);
    const visible = () => { if (document.visibilityState === "visible") update(); };
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(update, 60_000);
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel.current = new BroadcastChannel("animalerie-khalil:auth");
        channel.current.onmessage = update;
      } catch {
        // Focus/visibility checks still synchronize browsers that block this API.
        channel.current = null;
      }
    }
    return () => {
      requestGeneration.current++;
      window.clearTimeout(initialCheck);
      window.removeEventListener("focus", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", visible);
      window.clearInterval(timer);
      channel.current?.close();
      channel.current = null;
    };
  }, [refresh]);

  async function login(data: { email: string; password: string; rememberMe: boolean }) {
    ++generation.current;
    const result = await request<{ user: AuthUser }>("login", data);
    ++generation.current;
    setUser(result.user); setLoading(false); setError("");
    channel.current?.postMessage("changed");
    return result.user;
  }
  async function register(data: Registration) { await request("register", data); }
  async function logout() {
    ++generation.current;
    await request("logout", {});
    ++generation.current;
    setUser(null); setLoading(false); setError("");
    channel.current?.postMessage("changed");
  }

  return <AuthContext.Provider value={{ user, loading, error, refresh, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider est requis.");
  return context;
}
