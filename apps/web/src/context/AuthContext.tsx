import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthSession } from "@tulonglink/shared";
import { getCurrentSession } from "../services/authService.js";

interface AuthContextValue {
  /** undefined = still loading from IndexedDB; null = no local session. */
  session: AuthSession | null | undefined;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const current = await getCurrentSession();
    setSession(current ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ session, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
