import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { MessageSquare, DollarSign, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface DisputeRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_name: string;
  amount: number;
  status: string;
}

interface MessageRow {
  id: string;
  from_user_id: string;
  text: string;
  created_at: string;
}

export default function Disputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [selected, setSelected] = useState<DisputeRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("disputes").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setDisputes(data);
        setSelected(data[0]);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("dispute_messages")
        .select("*")
        .eq("dispute_id", selected.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
  }, [selected]);

  const handleAction = async (type: "release" | "refund") => {
    if (!selected) return;
    const newStatus = type === "release" ? "resolved" : "resolved";
    await supabase.from("disputes").update({ status: newStatus }).eq("id", selected.id);
    toast.success(type === "release" ? "Fonlar satıcıya serbest bırakıldı." : "Fonlar alıcıya iade edildi.");
    setDisputes((prev) => prev.map((d) => d.id === selected.id ? { ...d, status: newStatus } : d));
    setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected || !user) return;
    await supabase.from("dispute_messages").insert({
      dispute_id: selected.id,
      sender_id: user.id,
      message: newMsg.trim(),
    } as any);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from_user_id: user.id, text: newMsg.trim(), created_at: new Date().toISOString() }]);
    setNewMsg("");
  };

  return (
    <PageShell>
      <h1 className="text-xl font-mono font-bold text-primary neon-text mb-6">Dispute Resolution</h1>

      {disputes.length === 0 ? (
        <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">Henüz uyuşmazlık yok.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            {disputes.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full text-left glass-card rounded-lg p-3 transition-all ${
                  selected?.id === d.id ? "neon-border" : "hover:bg-secondary"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono text-primary">{d.id.slice(0, 8)}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    d.status === "open" ? "bg-yellow-500/10 text-yellow-500" : d.status === "escalated" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500"
                  }`}>{d.status.toUpperCase()}</span>
                </div>
                <div className="text-sm text-foreground">{d.product_name}</div>
                <div className="text-xs text-muted-foreground">{d.amount} LTC</div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="col-span-2 glass-card rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-muted-foreground font-mono">Uyuşmazlık: {selected.product_name}</span>
                {selected.status !== "resolved" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction("release")} className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-500 text-xs font-mono rounded hover:bg-green-600/30 transition-all">
                      <DollarSign className="w-3 h-3" /> Serbest Bırak
                    </button>
                    <button onClick={() => handleAction("refund")} className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 text-primary text-xs font-mono rounded hover:bg-primary/30 transition-all">
                      <RotateCcw className="w-3 h-3" /> İade Et
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {messages.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Henüz mesaj yok.</div>}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.from_user_id === selected.buyer_id ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[70%] p-2.5 rounded-lg text-sm ${
                      m.from_user_id === selected.buyer_id ? "bg-secondary text-foreground" : "bg-primary/10 text-foreground"
                    }`}>
                      <div className="text-[10px] text-muted-foreground font-mono mb-1">{new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Admin mesajı..."
                  className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={sendMessage} className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-mono font-bold neon-glow-btn">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
