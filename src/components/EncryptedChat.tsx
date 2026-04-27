import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Lock, Send, Loader2, KeyRound, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { encryptForRecipients } from "@/lib/pgp";
import { toast } from "sonner";

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  ciphertext: string;
  iv: string;
  created_at: string;
  decrypted?: string;
}

interface PgpKeyRow {
  user_id: string;
  public_key: string;
  fingerprint: string;
}

// Per-conversation key derivation using PBKDF2 from order ID + user IDs
async function deriveKey(orderId: string, userId1: string, userId2: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Sort user IDs to ensure both parties derive the same key
  const sortedIds = [userId1, userId2].sort().join(":");
  const seed = `${orderId}:${sortedIds}`;
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(seed), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("aeigsthub-e2e-v2"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptMessage(
  text: string,
  orderId: string,
  userId1: string,
  userId2: string,
): Promise<{ encrypted: string; iv: string }> {
  const key = await deriveKey(orderId, userId1, userId2);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptMessage(
  encrypted: string,
  iv: string,
  orderId: string,
  userId1: string,
  userId2: string,
): Promise<string> {
  try {
    const key = await deriveKey(orderId, userId1, userId2);
    const encBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, encBytes);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "[Şifre çözülemedi]";
  }
}

interface Props {
  orderId: string;
  otherUserId: string;
}

export default function EncryptedChat({ orderId, otherUserId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [pgpKeys, setPgpKeys] = useState<Record<string, PgpKeyRow>>({});
  const [keysLoading, setKeysLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!user?.id || !otherUserId) return;
    const loadKeys = async () => {
      try {
        setKeysLoading(true);
        const { data, error } = await supabase
          .from("user_pgp_keys")
          .select("user_id, public_key, fingerprint")
          .in("user_id", [user.id, otherUserId]);

        if (!isMounted.current) return;
        if (error) {
          if (import.meta.env.DEV) console.error("Error loading PGP keys for chat:", error);
          return;
        }

        const next: Record<string, PgpKeyRow> = {};
        (data || []).forEach((key: any) => {
          next[key.user_id] = key;
        });
        setPgpKeys(next);
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch loading PGP keys for chat:", e);
      } finally {
        if (isMounted.current) setKeysLoading(false);
      }
    };
    loadKeys();
    return () => {
      isMounted.current = false;
    };
  }, [user?.id, otherUserId]);

  useEffect(() => {
    if (!orderId) return;
    isMounted.current = true;
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("encrypted_messages")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });

        if (!isMounted.current) return;
        if (error) {
          if (import.meta.env.DEV) console.error("Error fetching encrypted messages:", error);
          return;
        }

        if (data) {
          const decrypted = await Promise.all(
            data.map(async (m: any) => ({
              ...m,
              decrypted: m.ciphertext?.startsWith("-----BEGIN PGP MESSAGE-----")
                ? "[PGP ciphertext — özel anahtarla dışarıda çözülür]"
                : await decryptMessage(m.ciphertext, m.iv, orderId, user?.id || "", otherUserId),
            })),
          );
          if (isMounted.current) setMessages(decrypted);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch fetching encrypted messages:", e);
      }
    };
    fetch();

    // Realtime subscription
    const channel = supabase
      .channel(`enc-msg-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "encrypted_messages",
          filter: `order_id=eq.${orderId}`,
        },
        async (payload) => {
          try {
            const m = payload.new as any;
            const decrypted = m.ciphertext?.startsWith("-----BEGIN PGP MESSAGE-----")
              ? "[PGP ciphertext — özel anahtarla dışarıda çözülür]"
              : await decryptMessage(m.ciphertext, m.iv, orderId, user?.id || "", otherUserId);

            if (isMounted.current) {
              setMessages((prev) => [...prev, { ...m, decrypted }]);
            }
          } catch (e) {
            if (import.meta.env.DEV) console.error("Error processing realtime message:", e);
          }
        },
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [orderId, otherUserId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || sending) return;
    const senderKey = pgpKeys[user.id]?.public_key;
    const recipientKey = pgpKeys[otherUserId]?.public_key;

    if (!senderKey || !recipientKey) {
      toast.error("Mesaj gönderilemedi: Her iki tarafın da PGP anahtarı yüklü olmalıdır.");
      return;
    }

    setSending(true);
    try {
      const encrypted = await encryptForRecipients(newMsg.trim(), [senderKey, recipientKey]);
      const { error } = await supabase.from("encrypted_messages").insert({
        order_id: orderId,
        sender_id: user.id,
        ciphertext: encrypted,
        iv: "pgp-armored", // PGP handles IV internally, using this as a flag
      });

      if (!isMounted.current) return;
      if (error) throw error;
      setNewMsg("");
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("Error sending encrypted message:", err);
      toast.error("Şifreleme hatası: " + err.message);
    } finally {
      if (isMounted.current) setSending(false);
    }
  };

  const hasBothKeys = pgpKeys[user?.id || ""] && pgpKeys[otherUserId];

  return (
    <div className="glass-card rounded-lg flex flex-col h-[500px] relative overflow-hidden border border-primary/20">
      <div className="p-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Lock className="w-4 h-4 text-primary" />
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-primary/20 blur-sm rounded-full"
            />
          </div>
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-widest">
            PGP-E2E Operasyon DM
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${hasBothKeys ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-yellow-500"}`}
          />
          <span className="text-[10px] font-mono text-muted-foreground">
            {hasBothKeys ? "GÜVENLİ" : "PGP EKSİK"}
          </span>
        </div>
      </div>

      {!hasBothKeys && !keysLoading && (
        <div className="absolute inset-x-0 top-[45px] z-10 p-3 bg-yellow-500/10 border-b border-yellow-500/30 backdrop-blur-md">
          <div className="flex gap-2 text-[10px] font-mono text-yellow-500 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong>DİKKAT:</strong> Mesajlaşma için her iki tarafın da profilinde{" "}
              <strong>PGP Public Key</strong> tanımlı olmalıdır. Karşı tarafın anahtarı yoksa
              iletişim kurulamaz.
            </span>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-40">
            <KeyRound className="w-8 h-8 text-primary" />
            <p className="text-[11px] font-mono max-w-[200px]">
              Henüz mesaj yok. PGP katmanı aktif.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <motion.div
              initial={{ opacity: 0, x: m.sender_id === user?.id ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={m.id}
              className={`flex flex-col ${m.sender_id === user?.id ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg text-xs font-mono break-words ${
                  m.sender_id === user?.id
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-secondary border border-border rounded-tl-none"
                }`}
              >
                {m.decrypted}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground mt-1 px-1">
                {new Date(m.created_at).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </motion.div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-primary/20 bg-background/50 backdrop-blur">
        <div className="flex gap-2">
          <textarea
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            disabled={!hasBothKeys || sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={hasBothKeys ? "Şifreli mesaj yaz..." : "PGP anahtarı bekleniyor..."}
            className="flex-1 bg-secondary/50 border border-primary/20 rounded p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none h-10 min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!hasBothKeys || !newMsg.trim() || sending}
            className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-mono text-muted-foreground uppercase tracking-tighter opacity-60">
          <ShieldCheck className="w-3 h-3" /> Sunucuda sadece PGP ciphertext tutulur
        </div>
      </div>
    </div>
  );
}
