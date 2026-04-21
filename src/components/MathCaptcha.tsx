import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, RefreshCw, Timer, AlertTriangle } from "lucide-react";

interface Props {
  onValidChange: (valid: boolean) => void;
  label?: string;
}

interface Challenge {
  expr: string;
  answer: number;
}

// Generate a brutal multi-operator challenge with parentheses
function makeChallenge(): Challenge {
  const ops = ["+", "-", "*"] as const;
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Pattern: (a OP1 b) OP2 (c OP3 d)
  const a = rand(2, 19);
  const b = rand(2, 19);
  const c = rand(2, 19);
  const d = rand(2, 19);
  const o1 = pick(ops);
  const o2 = pick(ops);
  const o3 = pick(ops);

  const expr = `(${a} ${o1} ${b}) ${o2} (${c} ${o3} ${d})`;
  // eslint-disable-next-line no-new-func
  const answer = Function(`"use strict"; return (${expr.replace(/\s/g, "")});`)() as number;
  return { expr, answer };
}

const TIME_LIMIT = 25; // seconds
const MAX_ATTEMPTS = 3;

export default function MathCaptcha({ onValidChange, label = "Bot doğrulama (zor mod)" }: Props) {
  const [challenge, setChallenge] = useState<Challenge>(() => ({ expr: "...", answer: 0 }));
  const [val, setVal] = useState("");
  const [valid, setValid] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT);
  const [shake, setShake] = useState(false);

  const regen = useCallback((resetAttempts = false) => {
    setChallenge(makeChallenge());
    setVal("");
    setValid(false);
    setSecondsLeft(TIME_LIMIT);
    if (resetAttempts) {
      setAttempts(0);
      setLocked(false);
    }
    onValidChange(false);
  }, [onValidChange]);

  // Initial generation client-side only (avoid SSR mismatch)
  useEffect(() => {
    regen(true);
  }, []);

  // Countdown
  useEffect(() => {
    if (locked || valid) return;
    if (secondsLeft <= 0) {
      // Time up — count as failed attempt
      setAttempts((a) => {
        const n = a + 1;
        if (n >= MAX_ATTEMPTS) setLocked(true);
        return n;
      });
      regen(false);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, locked, valid, regen]);

  // Lockout cooldown
  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(() => {
      setLocked(false);
      setAttempts(0);
      regen(true);
    }, 30000);
    return () => clearTimeout(t);
  }, [locked, regen]);

  const handleSubmit = () => {
    if (locked) return;
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed === challenge.answer) {
      setValid(true);
      onValidChange(true);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setAttempts((a) => {
        const n = a + 1;
        if (n >= MAX_ATTEMPTS) setLocked(true);
        return n;
      });
      regen(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-mono text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> {label}
        </span>
        {!locked && !valid && (
          <span className="flex items-center gap-1 text-primary">
            <Timer className="w-3 h-3" /> {secondsLeft}s · {MAX_ATTEMPTS - attempts} hak
          </span>
        )}
      </label>

      {locked ? (
        <div className="flex items-center gap-2 p-3 rounded border border-destructive/40 bg-destructive/10 text-destructive font-mono text-xs">
          <AlertTriangle className="w-4 h-4" />
          Çok fazla hatalı deneme. 30 saniye kilit.
        </div>
      ) : valid ? (
        <div className="flex items-center gap-2 p-3 rounded border border-green-500/40 bg-green-500/10 text-green-500 font-mono text-xs">
          <ShieldCheck className="w-4 h-4" /> İnsan doğrulandı.
        </div>
      ) : (
        <>
          <div className={`flex items-center gap-2 ${shake ? "animate-pulse" : ""}`}>
            <span
              className="font-mono text-sm bg-secondary/40 px-3 py-2 rounded border border-border select-none tracking-widest"
              style={{ letterSpacing: "0.15em" }}
            >
              {challenge.expr} = ?
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={val}
              autoComplete="off"
              onChange={(e) => setVal(e.target.value.replace(/[^\d-]/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              placeholder="cevap"
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="px-3 py-2 text-xs font-mono bg-primary/20 text-primary border border-primary/40 rounded hover:bg-primary/30"
            >
              Doğrula
            </button>
            <button
              type="button"
              onClick={() => regen(false)}
              className="p-2 text-muted-foreground hover:text-foreground"
              aria-label="Yenile"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Operatör önceliğine dikkat et: parantez → çarpma → toplama/çıkarma.
          </p>
        </>
      )}
    </div>
  );
}
