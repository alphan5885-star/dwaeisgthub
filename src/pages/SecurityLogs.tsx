import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle } from "lucide-react";

interface LogEntry {
  id: string;
  ip: string | null;
  device: string | null;
  created_at: string;
  success: boolean;
  user_email: string | null;
}

export default function SecurityLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setLogs(data as any);
    };
    fetchLogs();

    // Subscribe to realtime
    const channel = supabase
      .channel("security_logs_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_logs" }, (payload) => {
        setLogs((prev) => [payload.new as LogEntry, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Security Event Log</h1>
        <span className="text-xs font-mono text-muted-foreground animate-pulse-neon">● LIVE</span>
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
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">Henüz log kaydı yok.</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                <td className="p-3 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("tr-TR")}</td>
                <td className="p-3 text-xs">{log.user_email || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{log.ip || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{log.device || "—"}</td>
                <td className="p-3">
                  {log.success ? (
                    <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle className="w-3 h-3" /> OK</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-primary"><XCircle className="w-3 h-3" /> FAIL</span>
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
