import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * SecurityProvider — istemci tarafı güvenlik katmanı.
 *
 * Not: Bu koruma katmanı kötü niyetli, teknik bilgili saldırganlara karşı
 * mutlak değildir; gerçek güvenlik sunucu tarafında (RLS + signature + reverse
 * proxy seviyesinde rate limit) yapılır. Burası UX katmanında saldırı yüzeyini
 * daraltır ve şüpheli davranışı tespit eder.
 */

type ThreatLevel = "ok" | "warn" | "danger";

interface SecurityState {
  threatLevel: ThreatLevel;
  events: SecurityEvent[];
  blocked: boolean;
  unblock: () => void;
  /** Bir eylemi rate-limit'e tabi tut. true dönerse devam edebilirsin. */
  guard: (action: string, maxPerMinute?: number) => boolean;
}

interface SecurityEvent {
  id: string;
  at: number;
  type: string;
  detail?: string;
  level: ThreatLevel;
}

const Ctx = createContext<SecurityState | null>(null);

const RAPID_CLICK_WINDOW = 1000;
const RAPID_CLICK_THRESHOLD = 12;
const BLOCK_DURATION_MS = 15_000;

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>("ok");
  const [blocked, setBlocked] = useState(false);
  const clickTimes = useRef<number[]>([]);
  const actionBuckets = useRef<Map<string, number[]>>(new Map());

  const log = (type: string, level: ThreatLevel, detail?: string) => {
    const ev: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      type,
      detail,
      level,
    };
    setEvents((prev) => [ev, ...prev].slice(0, 50));
    if (level === "danger") setThreatLevel("danger");
    else if (level === "warn") setThreatLevel((prev) => (prev === "danger" ? prev : "warn"));
  };

  const guard = (action: string, maxPerMinute = 30): boolean => {
    if (blocked) return false;
    const now = Date.now();
    const bucket = actionBuckets.current.get(action) ?? [];
    const fresh = bucket.filter((t) => now - t < 60_000);
    if (fresh.length >= maxPerMinute) {
      log("rate_limit", "warn", `${action} (${fresh.length}/${maxPerMinute}/dk)`);
      return false;
    }
    fresh.push(now);
    actionBuckets.current.set(action, fresh);
    return true;
  };

  // Devtools detection (timing-based, debugger trap)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let warned = false;
    const check = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const dur = performance.now() - start;
      if (dur > 100 && !warned) {
        warned = true;
        log("devtools_open", "warn", `${dur.toFixed(0)}ms gecikme`);
      } else if (dur < 50) {
        warned = false;
      }
    };
    const id = setInterval(check, 4000);
    return () => clearInterval(id);
  }, []);

  // Sağ tık + bazı dev kısayollarını engelle (anonimlik / casual snooping)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      log("context_menu_blocked", "ok");
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        k === "f12" ||
        (e.ctrlKey && e.shiftKey && (k === "i" || k === "j" || k === "c")) ||
        (e.ctrlKey && k === "u")
      ) {
        e.preventDefault();
        log("devtool_shortcut_blocked", "warn", k);
      }
    };
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Rapid-click / bot detection → geçici block
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onClick = () => {
      const now = Date.now();
      clickTimes.current = [...clickTimes.current, now].filter((t) => now - t < RAPID_CLICK_WINDOW);
      if (clickTimes.current.length > RAPID_CLICK_THRESHOLD) {
        log("rapid_click", "danger", `${clickTimes.current.length} tık/sn`);
        setBlocked(true);
        clickTimes.current = [];
        setTimeout(() => setBlocked(false), BLOCK_DURATION_MS);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Headless / WebDriver tespiti
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    if ((navigator as any).webdriver) {
      log("webdriver_detected", "danger", "navigator.webdriver=true");
    }
    if (!navigator.languages || navigator.languages.length === 0) {
      log("no_languages", "warn", "headless ihtimali");
    }
  }, []);

  const unblock = () => {
    setBlocked(false);
    clickTimes.current = [];
  };

  return (
    <Ctx.Provider value={{ threatLevel, events, blocked, unblock, guard }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSecurity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSecurity must be inside SecurityProvider");
  return ctx;
}
