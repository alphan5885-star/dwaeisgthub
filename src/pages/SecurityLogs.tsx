import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Terminal as TerminalIcon } from "lucide-react";
import SecurityTerminal from "@/components/SecurityTerminal";

interface LogEntry {
  id: string;
  ip: string | null;
  device: string | null;
  created_at: string;
  success: boolean;
  user_email: string | null;
}

export default function SecurityLogs() {
  const isMounted = useRef(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    isMounted.current = true;
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from("security_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30);

        if (!isMounted.current) return;

        if (error) {
          if (import.meta.env.DEV) console.error("Error fetching security logs:", error);
          return;
        }

        if (data) setLogs(data as any);
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch error in SecurityLogs fetch:", e);
      }
    };
    fetchLogs();

    // Subscribe to realtime
    const channel = supabase
      .channel("security_logs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "security_logs" },
        (payload) => {
          if (isMounted.current) {
            setLogs((prev) => [payload.new as LogEntry, ...prev].slice(0, 30));
          }
        },
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-mono font-bold text-primary neon-text">Güvenlik Merkezi</h1>
        </div>
        <span className="text-xs font-mono text-muted-foreground animate-pulse-neon">
          ● LIVE MONITOR
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <SecurityTerminal />
        </div>
        <div className="glass-card p-5 rounded-lg flex flex-col justify-center border-l-2 border-primary">
          <h3 className="text-sm font-mono font-bold text-foreground mb-4 uppercase tracking-wider">
            Güvenlik Özeti
          </h3>
          <div className="space-y-4">
            {[
              {
                label: "Son 24s Başarılı",
                value: logs.filter((l) => l.success).length,
                color: "text-green-500",
              },
              {
                label: "Şüpheli Girişim",
                value: logs.filter((l) => !l.success).length,
                color: "text-primary",
              },
              {
                label: "Farklı Cihazlar",
                value: new Set(logs.map((l) => l.device)).size,
                color: "text-blue-500",
              },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {s.label}
                </span>
                <span className={`text-lg font-mono font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <div className="text-[9px] font-mono text-muted-foreground uppercase mb-2">
              Sistem Durumu
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-1 flex-1 bg-green-500/40 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest">
          Olay Günlüğü
        </h2>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left p-3">ZAMAN</th>
              <th className="text-left p-3">KULLANICI</th>
              <th className="text-left p-3">IP</th>
              <th className="text-left p-3">CİHAZ</th>
              <th className="text-left p-3">DURUM</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">
                  Henüz log kaydı yok.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
              >
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("tr-TR")}
                </td>
                <td className="p-3 text-xs">{log.user_email || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{log.ip || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{log.device || "—"}</td>
                <td className="p-3">
                  {log.success ? (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle className="w-3 h-3" /> OK
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <XCircle className="w-3 h-3" /> FAIL
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
