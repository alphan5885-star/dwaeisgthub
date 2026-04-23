import { useState } from "react";
import { useSecurity } from "@/lib/securityContext";
import { Shield, ShieldAlert, ShieldCheck, X } from "lucide-react";

export default function SecurityHud() {
  const { threatLevel, events, blocked, unblock } = useSecurity();
  const [open, setOpen] = useState(false);

  const Icon = threatLevel === "danger" ? ShieldAlert : threatLevel === "warn" ? Shield : ShieldCheck;
  const color =
    threatLevel === "danger"
      ? "text-destructive border-destructive/50"
      : threatLevel === "warn"
        ? "text-yellow-500 border-yellow-500/50"
        : "text-primary border-primary/30";

  return (
    <>
      {blocked && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur z-[100] flex items-center justify-center p-4">
          <div className="glass-card neon-border rounded-lg p-6 max-w-sm text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="font-mono font-bold text-destructive">Şüpheli aktivite tespit edildi</h2>
            <p className="text-xs font-mono text-muted-foreground">
              Çok hızlı tıklama / bot davranışı algılandı. Erişim 15 saniye boyunca kısıtlandı.
            </p>
            <button
              onClick={unblock}
              className="px-4 py-2 bg-primary text-primary-foreground rounded font-mono text-xs hover:opacity-90"
            >
              İnsanım, devam et
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        title={`Güvenlik durumu: ${threatLevel}`}
        className={`fixed bottom-4 left-4 z-40 w-10 h-10 rounded-full bg-card border ${color} flex items-center justify-center hover:scale-110 transition-transform`}
      >
        <Icon className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="glass-card neon-border rounded-lg p-5 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono font-bold text-primary flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Güvenlik Olayları
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground text-center py-4">Olay yok — tüm sistemler nominal.</p>
            ) : (
              <div className="space-y-1">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className={`text-[11px] font-mono p-2 rounded border ${
                      e.level === "danger"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : e.level === "warn"
                          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
                          : "border-border bg-secondary/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-bold">{e.type}</span>
                      <span>{new Date(e.at).toLocaleTimeString("tr-TR")}</span>
                    </div>
                    {e.detail && <div className="opacity-80">{e.detail}</div>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] font-mono text-muted-foreground mt-3 pt-3 border-t border-border">
              Not: Frontend tespitidir. Gerçek güvenlik sunucu tarafında (RLS + sunucu rate-limit) sağlanır.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
