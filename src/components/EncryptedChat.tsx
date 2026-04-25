import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Lock, Send, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { encryptForRecipients } from "@/lib/pgp";

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
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(seed), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("aeigsthub-e2e-v2"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(text: string, orderId: string, userId1: string, userId2: string): Promise<{ encrypted: string; iv: string }> {
  const key = await deriveKey(orderId, userId1, userId2);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptMessage(encrypted: string, iv: string, orderId: string, userId1: string, userId2: string): Promise<string> {
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

  useEffect(() => {
    if (!user?.id || !otherUserId) return;
    const loadKeys = async () => {
      setKeysLoading(true);
      const { data } = await supabase
        .from("user_pgp_keys")
        .select("user_id, public_key, fingerprint")
        .in("user_id", [user.id, otherUserId]);
      const next: Record<string, PgpKeyRow> = {};
      (data || []).forEach((key: any) => {
        next[key.user_id] = key;
      });
      setPgpKeys(next);
      setKeysLoading(false);
    };
    loadKeys();
  }, [user?.id, otherUserId]);

  useEffect(() => {
    if (!orderId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("encrypted_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (data) {
        const decrypted = await Promise.all(
          data.map(async (m: any) => ({
            ...m,
            decrypted: m.ciphertext?.startsWith("-----BEGIN PGP MESSAGE-----")
              ? "[PGP ciphertext — özel anahtarla dışarıda çözülür]"
              : await decryptMessage(m.ciphertext, m.iv, orderId, user?.id || "", otherUserId),
          }))
        );
        setMessages(decrypted);
      }
    };
    fetch();

    // Realtime subscription
    const channel = supabase
      .channel(`enc-msg-${orderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "encrypted_messages", filter: `order_id=eq.${orderId}` },
        async (payload) => {
          const m = payload.new as any;
          const decrypted = m.ciphertext?.startsWith("-----BEGIN PGP MESSAGE-----")
            ? "[PGP ciphertext — özel anahtarla dışarıda çözülür]"
            : await decryptMessage(m.ciphertext, m.iv, orderId, user?.id || "", otherUserId);
          setMessages((prev) => [...prev, { ...m, decrypted }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, otherUserId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || sending) return;
    setSending(true);
    const { encrypted, iv } = await encryptMessage(newMsg.trim(), orderId, user.id, otherUserId);
    await supabase.from("encrypted_messages").insert({
      order_id: orderId,
      sender_id: user.id,
      ciphertext: encrypted,
      iv,
    } as any);
    setNewMsg("");
    setSending(false);
  };

  return (
    <div className="glass-card rounded-lg p-4 neon-border">
      <div className="flex items-center gap-2 mb-3 text-xs font-mono text-primary">
        <Lock className="w-3 h-3" /> AES-256 Şifreli Mesajlaşma (aktarım sırasında şifrelenir)
      </div>

      <div ref={scrollRef} className="space-y-2 max-h-64 overflow-y-auto pr-2 mb-3">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6 font-mono">Henüz mesaj yok. Şifreli iletişime başla.</div>
        )}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
              m.sender_id === user?.id ? "bg-primary/15 text-foreground" : "bg-secondary text-foreground"
            }`}>
              <div className="text-[10px] text-muted-foreground font-mono mb-0.5">
                {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                <Lock className="w-2 h-2 inline ml-1" />
              </div>
              {m.decrypted || m.encrypted_text}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Şifreli mesaj yaz..."
          className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={sendMessage} disabled={sending} className="px-3 py-2 bg-primary text-primary-foreground rounded neon-glow-btn">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
