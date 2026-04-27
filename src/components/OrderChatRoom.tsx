import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Send, ShieldAlert } from "lucide-react";

interface Msg {
  id: string;
  sender_id: string | null;
  content: string;
  is_system: boolean;
  created_at: string;
}

export default function OrderChatRoom({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_room_messages")
        .select("id, sender_id, content, is_system, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Msg[]);
    };
    load();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((p) => [...p, payload.new as Msg]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const txt = input.trim();
    setInput("");
    await supabase.from("chat_room_messages").insert({
      room_id: roomId,
      sender_id: user.id,
      content: txt,
      is_system: false,
    });
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[400px] border border-destructive/40 rounded bg-card/40">
      <div className="px-3 py-2 border-b border-border bg-destructive/10 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-destructive" />
        <span className="text-xs font-mono text-destructive">
          Operasyon DM • 24 saat sonra imha edilir
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => {
          if (m.is_system) {
            return (
              <div
                key={m.id}
                className="text-[11px] font-mono text-destructive bg-destructive/10 border border-destructive/40 rounded px-2 py-1.5"
              >
                🛡️ {m.content}
              </div>
            );
          }
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-2.5 py-1.5 rounded text-xs ${mine ? "bg-primary/20 text-primary" : "bg-secondary/60 text-foreground"}`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 p-2 border-t border-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mesaj yaz..."
          className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-destructive"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-3 py-1.5 rounded bg-destructive text-destructive-foreground disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
