import { useEffect, useRef, useState, useCallback } from "react";
import { ShieldCheck, RefreshCw, AlertTriangle, Timer } from "lucide-react";

interface Props {
  onValidChange: (valid: boolean) => void;
  label?: string;
}

const TRACK_WIDTH = 300;
const TRACK_HEIGHT = 110;
const PIECE_SIZE = 38;
const TOLERANCE = 4; // tighter tolerance
const MAX_ATTEMPTS = 3;
const TIME_LIMIT = 15; // seconds per challenge
const MIN_HUMAN_TIME_MS = 600; // anti-bot: too fast = bot
const MIN_PATH_VARIANCE = 8; // anti-bot: too straight = bot

export default function MathCaptcha({ onValidChange, label = "Puzzle doğrulama" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const pathRef = useRef<{ x: number; y: number; t: number }[]>([]);

  const [target, setTarget] = useState({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [decoys, setDecoys] = useState<{ x: number; y: number }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [valid, setValid] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT);
  const [seed, setSeed] = useState(0);

  const maxX = TRACK_WIDTH - PIECE_SIZE;
  const maxY = TRACK_HEIGHT - PIECE_SIZE;

  const regen = useCallback(() => {
    const tx = Math.floor(80 + Math.random() * (maxX - 100));
    const ty = Math.floor(8 + Math.random() * (maxY - 16));
    setTarget({ x: tx, y: ty });
    setPos({ x: 4, y: Math.floor(maxY / 2) });
    // Two decoy targets to confuse OCR/bots
    const decoyCount = 2;
    const ds: { x: number; y: number }[] = [];
    for (let i = 0; i < decoyCount; i++) {
      let dx: number,
        dy: number,
        tries = 0;
      do {
        dx = Math.floor(20 + Math.random() * (maxX - 40));
        dy = Math.floor(8 + Math.random() * (maxY - 16));
        tries++;
      } while (Math.hypot(dx - tx, dy - ty) < PIECE_SIZE * 1.5 && tries < 10);
      ds.push({ x: dx, y: dy });
    }
    setDecoys(ds);
    setValid(false);
    setSecondsLeft(TIME_LIMIT);
    setSeed((s) => s + 1);
    pathRef.current = [];
    onValidChange(false);
  }, [maxX, maxY, onValidChange]);

  useEffect(() => {
    regen();
  }, [regen]);

  // Countdown timer
  useEffect(() => {
    if (locked || valid) return;
    if (secondsLeft <= 0) {
      setAttempts((a) => {
        const n = a + 1;
        if (n >= MAX_ATTEMPTS) setLocked(true);
        return n;
      });
      regen();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, locked, valid, regen]);

  // Lockout cooldown — escalating: 30s, 60s, 120s
  useEffect(() => {
    if (!locked) return;
    const cooldown = 30000;
    const t = setTimeout(() => {
      setLocked(false);
      setAttempts(0);
      regen();
    }, cooldown);
    return () => clearTimeout(t);
  }, [locked, regen]);

  const startDrag = (clientX: number, clientY: number) => {
    if (locked || valid || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // must start near current piece
    if (Math.hypot(x - (pos.x + PIECE_SIZE / 2), y - (pos.y + PIECE_SIZE / 2)) > PIECE_SIZE) return;
    setDragging(true);
    startTimeRef.current = Date.now();
    pathRef.current = [{ x, y, t: 0 }];
  };

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      let x = clientX - rect.left - PIECE_SIZE / 2;
      let y = clientY - rect.top - PIECE_SIZE / 2;
      x = Math.max(0, Math.min(maxX, x));
      y = Math.max(0, Math.min(maxY, y));
      setPos({ x, y });
      pathRef.current.push({ x, y, t: Date.now() - startTimeRef.current });
    },
    [dragging, maxX, maxY],
  );

  const endDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const elapsed = Date.now() - startTimeRef.current;
    const dist = Math.hypot(pos.x - target.x, pos.y - target.y);

    // Anti-bot heuristics
    const path = pathRef.current;
    const yValues = path.map((p) => p.y);
    const yMean = yValues.reduce((s, v) => s + v, 0) / Math.max(1, yValues.length);
    const yVariance =
      yValues.reduce((s, v) => s + (v - yMean) ** 2, 0) / Math.max(1, yValues.length);
    const tooFast = elapsed < MIN_HUMAN_TIME_MS;
    const tooStraight = yVariance < MIN_PATH_VARIANCE && path.length > 5;
    const tooFewSamples = path.length < 5;

    const fail = dist > TOLERANCE || tooFast || tooStraight || tooFewSamples;

    if (!fail) {
      setValid(true);
      onValidChange(true);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 350);
      setAttempts((a) => {
        const n = a + 1;
        if (n >= MAX_ATTEMPTS) setLocked(true);
        return n;
      });
      setTimeout(() => regen(), 400);
    }
  }, [dragging, pos, target, onValidChange, regen]);

  // Global drag listeners
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onUp = () => endDrag();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, moveDrag, endDrag]);

  const dots = Array.from({ length: 24 }).map((_, i) => {
    const r = ((seed * 7 + i * 13) % 100) / 100;
    const g = ((seed * 11 + i * 17) % 100) / 100;
    return { left: `${r * 100}%`, top: `${g * 100}%`, size: 3 + ((i + seed) % 4) };
  });

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
          Bot davranışı tespit edildi. 30 saniye kilit.
        </div>
      ) : valid ? (
        <div className="flex items-center gap-2 p-3 rounded border border-green-500/40 bg-green-500/10 text-green-500 font-mono text-xs">
          <ShieldCheck className="w-4 h-4" /> İnsan doğrulandı.
        </div>
      ) : (
        <div className="space-y-2">
          <div
            ref={trackRef}
            className={`relative rounded border border-border overflow-hidden bg-secondary/30 ${shake ? "animate-pulse" : ""}`}
            style={{
              width: TRACK_WIDTH,
              height: TRACK_HEIGHT,
              maxWidth: "100%",
              touchAction: "none",
            }}
          >
            {dots.map((d, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-primary/15"
                style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
              />
            ))}

            {/* Decoy targets — wrong landing zones */}
            {decoys.map((d, i) => (
              <div
                key={i}
                className="absolute rounded border border-dashed border-muted-foreground/30"
                style={{ left: d.x, top: d.y, width: PIECE_SIZE, height: PIECE_SIZE }}
              />
            ))}

            {/* Real target */}
            <div
              className="absolute rounded border-2 border-dashed border-primary bg-background/60"
              style={{ left: target.x, top: target.y, width: PIECE_SIZE, height: PIECE_SIZE }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-primary/70">
                BURAYA
              </span>
            </div>

            {/* Draggable piece */}
            <div
              role="slider"
              aria-label="Puzzle parçası"
              aria-valuenow={Math.round(pos.x)}
              aria-valuemin={0}
              aria-valuemax={maxX}
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
              }}
              className={`absolute rounded shadow-lg cursor-grab active:cursor-grabbing select-none flex items-center justify-center font-mono text-xs ${
                dragging ? "scale-110 z-10" : ""
              } bg-primary text-primary-foreground border-2 border-primary-foreground/30 transition-transform`}
              style={{
                left: pos.x,
                top: pos.y,
                width: PIECE_SIZE,
                height: PIECE_SIZE,
                touchAction: "none",
              }}
            >
              ✦
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground font-mono">
            Parçayı doğru hedefe (kalın çerçeve) sürükle. Çok düz veya çok hızlı hareket = bot.
          </p>
        </div>
      )}
    </div>
  );
}
