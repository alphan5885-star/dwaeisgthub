import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-shim";

interface SessionTimerState {
  remainingMs: number;
  expiresAt: number | null;
  startSession: (durationMin: number) => void;
  clearSession: () => void;
}

const SessionTimerContext = createContext<SessionTimerState | null>(null);

const STORAGE_KEY = "session_expires_at";

function purgeAllStorage() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      const eq = c.indexOf("=");
      const name = (eq > -1 ? c.substr(0, eq) : c).trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  } catch {}
}

export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v ? Number(v) : null;
  });
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const navigate = useNavigate();

  const startSession = useCallback((durationMin: number) => {
    const ts = Date.now() + durationMin * 60_000;
    localStorage.setItem(STORAGE_KEY, String(ts));
    localStorage.setItem("session_duration_min", String(durationMin));
    setExpiresAt(ts);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setExpiresAt(null);
    setRemainingMs(0);
  }, []);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(0);
      return;
    }
    const tick = async () => {
      const left = expiresAt - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        try {
          await supabase.auth.signOut();
        } catch {}
        purgeAllStorage();
        navigate("/", { replace: true });
        setExpiresAt(null);
        return;
      }
      setRemainingMs(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, navigate]);

  return (
    <SessionTimerContext.Provider value={{ remainingMs, expiresAt, startSession, clearSession }}>
      {children}
    </SessionTimerContext.Provider>
  );
}

export const useSessionTimer = () => {
  const ctx = useContext(SessionTimerContext);
  if (!ctx) throw new Error("useSessionTimer must be inside SessionTimerProvider");
  return ctx;
};
