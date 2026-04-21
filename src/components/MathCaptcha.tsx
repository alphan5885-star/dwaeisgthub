import { useEffect, useRef, useState, useCallback } from "react";
import { ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  onValidChange: (valid: boolean) => void;
  label?: string;
}

const TRACK_WIDTH = 280;
const PIECE_SIZE = 42;
const TOLERANCE = 6; // px
const MAX_ATTEMPTS = 4;

export default function MathCaptcha({ onValidChange, label = "Puzzle doğrulama" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState(0); // target X for the gap
  const [pos, setPos] = useState(0); // current piece X
  const [dragging, setDragging] = useState(false);
  const [valid, setValid] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);
  const [seed, setSeed] = useState(0);

  const maxX = TRACK_WIDTH - PIECE_SIZE;

  const regen = useCallback(() => {
    // place target somewhere not too close to start
    const t = Math.floor(60 + Math.random() * (maxX - 80));
    setTarget(t);
    setPos(0);
    setValid(false);
    setSeed((s) => s + 1);
    onValidChange(false);
  }, [maxX, onValidChange]);

  useEffect(() => {
    regen();
  }, []);

  // Lockout cooldown
  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(() => {
      setLocked(false);
      setAttempts(0);
      regen();
    }, 30000);
    return () => clearTimeout(t);
  }, [locked, regen]);

  const startDrag = (clientX: number) => {
    if (locked || valid) return;
    setDragging(true);
  };

  const moveDrag = useCallback(
    (clientX: number) => {
      if (!dragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      let x = clientX - rect.left - PIECE_SIZE / 2;
      if (x < 0) x = 0;
      if (x > maxX) x = maxX;
      setPos(x);
    },
    [dragging, maxX]
  );

  const endDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const diff = Math.abs(pos - target);
    if (diff <= TOLERANCE) {
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

  // Global mouse/touch listeners while dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => moveDrag(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) moveDrag(e.touches[0].clientX);
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

  // Generate background pattern (deterministic per seed)
  const dots = Array.from({ length: 18 }).map((_, i) => {
    const r = ((seed * 7 + i * 13) % 100) / 100;
    const g = ((seed * 11 + i * 17) % 100) / 100;
    return {
      left: `${r * 100}%`,
      top: `${g * 100}%`,
      size: 4 + ((i + seed) % 5),
    };
  });

  return (
    <div className="space-y-2">
      <label className="text-xs font-mono text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> {label}
        </span>
        {!locked && !valid && (
          <span className="text-primary">{MAX_ATTEMPTS - attempts} hak</span>
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
        <div className="space-y-2">
          {/* Puzzle scene */}
          <div
            ref={trackRef}
            className={`relative rounded border border-border overflow-hidden bg-secondary/30 ${shake ? "animate-pulse" : ""}`}
            style={{ width: TRACK_WIDTH, height: 100, maxWidth: "100%" }}
          >
            {/* decorative dots */}
            {dots.map((d, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-primary/20"
                style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
              />
            ))}

            {/* Target gap (where the piece must land) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded border-2 border-dashed border-primary/60 bg-background/50"
              style={{ left: target, width: PIECE_SIZE, height: PIECE_SIZE }}
            />

            {/* Draggable piece */}
            <div
              role="slider"
              aria-label="Puzzle parçası"
              aria-valuenow={Math.round(pos)}
              aria-valuemin={0}
              aria-valuemax={maxX}
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(e.clientX);
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) startDrag(e.touches[0].clientX);
              }}
              className={`absolute top-1/2 -translate-y-1/2 rounded shadow-lg cursor-grab active:cursor-grabbing select-none flex items-center justify-center font-mono text-xs ${
                dragging ? "scale-110" : ""
              } bg-primary text-primary-foreground border-2 border-primary-foreground/30 transition-transform`}
              style={{
                left: pos,
                width: PIECE_SIZE,
                height: PIECE_SIZE,
                touchAction: "none",
              }}
            >
              ⇆
            </div>
          </div>

          {/* Slider track / hint */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground font-mono">
              Parçayı sürükle, kesik çerçeveye bırak.
            </p>
            <button
              type="button"
              onClick={regen}
              className="p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Yenile"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
