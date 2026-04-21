import { useSessionTimer } from "@/lib/sessionTimerContext";
import { Clock } from "lucide-react";

function fmt(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600).toString().padStart(2, "0");
  const m = Math.floor((t % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function SessionTimerBadge() {
  const { remainingMs, expiresAt } = useSessionTimer();
  if (!expiresAt) return null;

  const critical = remainingMs > 0 && remainingMs <= 5 * 60_000;

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs border backdrop-blur-md ${
        critical
          ? "bg-destructive/20 border-destructive text-destructive animate-pulse"
          : "bg-card/80 border-border text-primary"
      }`}
      title="Oturum süresi"
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{fmt(remainingMs)}</span>
    </div>
  );
}
