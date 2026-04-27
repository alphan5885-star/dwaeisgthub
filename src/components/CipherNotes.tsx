import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Unlock, Plus, Trash2, Eye, EyeOff, Save, Key } from "lucide-react";
import { toast } from "sonner";
import { encryptForRecipient, isLikelyPgpPublicKey } from "@/lib/pgp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  title: string;
  ciphertext: string;
  created_at: number;
}

export default function CipherNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [userPubKey, setUserPubKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [encrypting, setEncrypting] = useState(false);

  const isMounted = useRef(true);

  const loadNotes = useCallback(() => {
    const saved = localStorage.getItem(`cipher-notes-${user?.id}`);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        if (import.meta.env.DEV) console.error("Failed to load notes", e);
      }
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    isMounted.current = true;
    if (user) {
      const load = async () => {
        try {
          const { data, error } = await (supabase as any)
            .from("user_pgp_keys")
            .select("public_key")
            .eq("user_id", user?.id)
            .maybeSingle();

          if (!isMounted.current) return;
          if (error) {
            if (import.meta.env.DEV) console.error("Error loading pubkey for cipher notes:", error);
          } else if (data?.public_key) {
            setUserPubKey(data.public_key);
          }
          loadNotes();
        } catch (e) {
          if (import.meta.env.DEV) console.error("Catch loading pubkey for cipher notes:", e);
        }
      };
      load();
    }
    return () => {
      isMounted.current = false;
    };
  }, [user, loadNotes]);

  const saveNotes = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem(`cipher-notes-${user?.id}`, JSON.stringify(updated));
  };

  const addNote = async () => {
    if (!newNote.trim() || !userPubKey) return;

    setEncrypting(true);
    try {
      const encrypted = await encryptForRecipient(newNote.trim(), userPubKey);
      if (!isMounted.current) return;

      const note: Note = {
        id: crypto.randomUUID(),
        title: newTitle.trim() || "Başlıksız Not",
        ciphertext: encrypted,
        created_at: Date.now(),
      };

      const updated = [note, ...notes];
      saveNotes(updated);
      setNewNote("");
      setNewTitle("");
      toast.success("Not şifrelenerek kaydedildi 🔐");
    } catch (e: any) {
      if (isMounted.current) toast.error("Şifreleme hatası: " + e.message);
    } finally {
      if (isMounted.current) setEncrypting(false);
    }
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    toast.success("Not silindi.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-mono font-bold text-foreground">Cipher Notes</h2>
        </div>
        {!userPubKey && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 uppercase">
            <Key className="w-3 h-3" /> PGP Anahtarı Gerekli
          </div>
        )}
      </div>

      {userPubKey && (
        <div className="glass-card p-4 border border-border rounded-lg space-y-3 bg-secondary/20">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Not başlığı..."
            className="w-full bg-background/50 border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none"
          />
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Not içeriği (sadece sizin tarafınızdan okunabilir)..."
            className="w-full h-24 bg-background/50 border border-border rounded p-3 text-xs font-mono focus:outline-none"
          />
          <button
            onClick={addNote}
            disabled={encrypting || !newNote.trim()}
            className="w-full py-2 bg-primary text-primary-foreground text-xs font-mono rounded flex items-center justify-center gap-2 neon-glow-btn"
          >
            {encrypting ? (
              "Şifreleniyor..."
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Şifrele ve Kaydet
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid gap-3">
        <AnimatePresence>
          {notes.length === 0 ? (
            <div className="text-center py-10 opacity-40">
              <EyeOff className="w-8 h-8 mx-auto mb-2" />
              <p className="text-[10px] font-mono">Henüz şifreli not yok.</p>
            </div>
          ) : (
            notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="glass-card p-4 border border-border rounded-lg flex items-center justify-between hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-primary flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-mono font-bold text-foreground truncate">
                      {note.title}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(note.ciphertext);
                      toast.success("Şifreli metin kopyalandı. PGP Toolkit ile çözebilirsiniz.");
                    }}
                    title="Şifreli metni kopyala"
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="bg-destructive/5 border border-destructive/20 rounded p-3">
        <p className="text-[9px] font-mono text-muted-foreground leading-relaxed italic uppercase">
          ⚠️ Notlar yerel olarak şifrelenmiş (PGP) şekilde saklanır. Sunucuda kayıt tutulmaz.
          Tarayıcı verilerini silerseniz notlar kaybolur.
        </p>
      </div>
    </div>
  );
}
