import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  purchase: "Satın Alma",
  sale: "Satış",
  commission: "Komisyon",
  escrow_hold: "Escrow Beklemede",
  escrow_release: "Escrow Serbest",
  withdrawal: "Çekim",
  deposit: "Yatırma",
};

export default function Transactions() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setTxs(data as Transaction[]);
        setLoading(false);
      });
  }, [user]);

  return (
    <PageShell>
      <h1 className="text-xl font-mono font-bold text-primary neon-text mb-6">İşlem Geçmişi</h1>

      {loading ? (
        <div className="text-muted-foreground font-mono animate-pulse">Yükleniyor...</div>
      ) : txs.length === 0 ? (
        <div className="text-muted-foreground font-mono text-sm">Henüz işlem yok.</div>
      ) : (
        <div className="space-y-2">
          {txs.map((tx) => (
            <div key={tx.id} className="glass-card rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  tx.amount >= 0 ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                }`}>
                  {tx.amount >= 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-foreground">
                    {typeLabels[tx.type] || tx.type}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{tx.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-mono font-bold ${tx.amount >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount} LTC
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <Clock className="w-3 h-3" />
                  {new Date(tx.created_at).toLocaleString("tr-TR")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}