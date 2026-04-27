import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * SecurityProvider — istemci tarafı güvenlik katmanı.
 *
 * Katmanlar:
 *  - Devtools / WebDriver / headless tespiti
 *  - Rapid-click bot koruması
 *  - Aksiyon başına rate-limit (UI seviyesi)
 *  - Anti-fingerprint shield (Canvas/WebGL/Audio noise injection)
 *  - Session fingerprint (UA + lang + tz + screen) — değişirse otomatik logout
 *  - Tor Browser tespiti
 *  - Inactivity wipe (X dakika hareketsizlikte sessionStorage temizliği)
 */

type ThreatLevel = "ok" | "warn" | "danger";

interface SecurityState {
  threatLevel: ThreatLevel;
  events: SecurityEvent[];
  blocked: boolean;
  isTor: boolean;
  fingerprintMismatch: boolean;
  unblock: () => void;
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
const FP_KEY = "__sec_fp_v1";
const INACTIVITY_MS = 15 * 60 * 1000; // 15dk

/* ------------------------- helpers ------------------------- */

async function computeFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "ssr";
  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages || []).join(","),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0),
    String((navigator as any).deviceMemory || 0),
  ].join("|");
  const buf = new TextEncoder().encode(parts);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Tor Browser heuristic. Kesin değil ama iyi bir tahmin. */
function detectTor(): boolean {
  if (typeof window === "undefined") return false;
  // .onion zaten kesin
  if (window.location.hostname.endsWith(".onion")) return true;
  // Tor Browser: timezone UTC, no battery API, resistFingerprinting → screen 1000x1000 multiples
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const noBattery = !("getBattery" in navigator);
  const tzUtc = tz === "UTC" || tz === "Atlantic/Reykjavik" || tz === "Etc/UTC";
  const roundedScreen = screen.width % 100 === 0 && screen.height % 100 === 0;
  const score = (tzUtc ? 1 : 0) + (noBattery ? 1 : 0) + (roundedScreen ? 1 : 0);
  return score >= 2;
}

/** Canvas / WebGL / Audio fingerprinting karşı önlemleri (noise injection). */
function installAntiFingerprint() {
  if (typeof window === "undefined") return;
  if ((window as any).__afp_installed) return;
  (window as any).__afp_installed = true;

  try {
    const proto = HTMLCanvasElement.prototype as any;
    const origToDataURL = proto.toDataURL;
    proto.toDataURL = function (...args: any[]) {
      try {
        const ctx = this.getContext("2d");
        if (ctx) {
          // 1px görünmez gürültü
          const noise = Math.floor(Math.random() * 10);
          ctx.fillStyle = `rgba(${noise},${noise},${noise},0.01)`;
          ctx.fillRect(0, 0, 1, 1);
        }
      } catch {
        void 0;
      }
      return origToDataURL.apply(this, args);
    };

    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (sx, sy, sw, sh) {
      const data = origGetImageData.call(this, sx, sy, sw, sh);
      // 50 pikselde bir 1 bit gürültü
      for (let i = 0; i < data.data.length; i += 50 * 4) {
        data.data[i] = data.data[i] ^ 1;
      }
      return data;
    };
  } catch {
    void 0;
  }

  try {
    const wgl = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param: number) {
      // VENDOR (0x1F00), RENDERER (0x1F01), UNMASKED_VENDOR (0x9245), UNMASKED_RENDERER (0x9246)
      if (param === 0x1f00 || param === 0x9245) return "Generic";
      if (param === 0x1f01 || param === 0x9246) return "Generic Renderer";
      return wgl.call(this, param);
    };
  } catch {
    void 0;
  }

  try {
    const ac = (window as any).AudioBuffer?.prototype;
    if (ac?.getChannelData) {
      const orig = ac.getChannelData;
      ac.getChannelData = function (ch: number) {
        const data = orig.call(this, ch);
        // Çok küçük gürültü
        for (let i = 0; i < data.length; i += 1000) {
          data[i] = data[i] + (Math.random() - 0.5) * 1e-7;
        }
        return data;
      };
    }
  } catch {
    void 0;
  }
}

/* ------------------------- provider ------------------------- */

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>("ok");
  const [blocked, setBlocked] = useState(false);
  const [isTor, setIsTor] = useState(false);
  const [fingerprintMismatch, setFingerprintMismatch] = useState(false);
  const clickTimes = useRef<number[]>([]);
  const actionBuckets = useRef<Map<string, number[]>>(new Map());
  const lastActivity = useRef<number>(Date.now());

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

  // Anti-fingerprint shield (mount'ta kur)
  useEffect(() => {
    installAntiFingerprint();
  }, []);

  // Tor detection + fingerprint check + inactivity wipe
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsTor(detectTor());

    (async () => {
      try {
        const fp = await computeFingerprint();
        const stored = localStorage.getItem(FP_KEY);
        if (!stored) {
          localStorage.setItem(FP_KEY, fp);
        } else if (stored !== fp) {
          log("fingerprint_change", "danger", "Cihaz/parmak izi değişti — oturum sonlandırıldı");
          setFingerprintMismatch(true);
          // Otomatik logout
          try {
            await supabase.auth.signOut();
          } catch {
            void 0;
          }
          localStorage.setItem(FP_KEY, fp);
        }
      } catch {
        void 0;
      }
    })();

    const onActivity = () => {
      lastActivity.current = Date.now();
    };
    ["mousemove", "keydown", "click", "touchstart"].forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );

    const inactivityTimer = setInterval(async () => {
      if (Date.now() - lastActivity.current > INACTIVITY_MS) {
        log("inactivity_wipe", "warn", `${INACTIVITY_MS / 60000}dk hareketsizlik`);
        try {
          sessionStorage.clear();
          await supabase.auth.signOut();
        } catch {
          void 0;
        }
        lastActivity.current = Date.now();
      }
    }, 30_000);

    return () => {
      ["mousemove", "keydown", "click", "touchstart"].forEach((e) =>
        window.removeEventListener(e, onActivity),
      );
      clearInterval(inactivityTimer);
    };
  }, []);

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
    <Ctx.Provider
      value={{ threatLevel, events, blocked, isTor, fingerprintMismatch, unblock, guard }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSecurity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSecurity must be inside SecurityProvider");
  return ctx;
}
