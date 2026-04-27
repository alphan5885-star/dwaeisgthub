import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import {
  parsePublicKey,
  formatFingerprint,
  isLikelyPgpPublicKey,
  generateKeyPair,
  type PgpKeyInfo,
} from "@/lib/pgp";
import {
  Key,
  ShieldCheck,
  Trash2,
  Copy,
  Loader2,
  Sparkles,
  Lock,
  AlertTriangle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface StoredKey {
  id: string;
  public_key: string;
  fingerprint: string;
  key_id: string | null;
  verified: boolean;
  created_at: string;
}

export default function PgpVault() {
  const { user } = useAuth();
  const [stored, setStored] = useState<StoredKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [armored, setArmored] = useState("");
  const [info, setInfo] = useState<PgpKeyInfo | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [genName, setGenName] = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [genPass, setGenPass] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedPriv, setGeneratedPriv] = useState<string | null>(null);
  const [mode, setMode] = useState<"import" | "generate">("import");

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("user_pgp_keys")
      .select("id, public_key, fingerprint, key_id, verified, created_at")
      .eq("user_id", user!.id)
      .maybeSingle();
    setStored((data as StoredKey | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!armored.trim()) {
        setInfo(null);
        setParseError(null);
        return;
      }
      if (!isLikelyPgpPublicKey(armored)) {
        setInfo(null);
        setParseError("Geçerli bir PGP public key block görünmüyor.");
        return;
      }
      try {
        const i = await parsePublicKey(armored);
        if (!cancelled) {
          setInfo(i);
          setParseError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setInfo(null);
          setParseError(e.message || "Anahtar okunamadı.");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [armored]);

  const save = async () => {
    if (!user || !info) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      public_key: armored.trim(),
      fingerprint: info.fingerprint,
      key_id: info.keyId,
      verified: false,
    };
    const { error } = await (supabase as any)
      .from("user_pgp_keys")
      .upsert(payload, { onConflict: "user_id" });
    if (error) toast.error(error.message);
    else {
      toast.success("PGP anahtarı kasaya kaydedildi 🔐");
      setArmored("");
      setInfo(null);
      await load();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!user || !stored) return;
    if (!confirm("PGP anahtarını silmek istediğine emin misin?")) return;
    const { error } = await (supabase as any).from("user_pgp_keys").delete().eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Anahtar silindi");
      setStored(null);
    }
  };

  const generate = async () => {
    if (!genName.trim() || !genEmail.trim() || genPass.length < 8) {
      toast.error("İsim, email ve en az 8 karakter parola gerekli");
      return;
    }
    setGenerating(true);
    try {
      const { publicKey, privateKey } = await generateKeyPair(
        genName.trim(),
        genEmail.trim(),
        genPass,
      );
      setArmored(publicKey);
      setGeneratedPriv(privateKey);
      toast.success("Anahtar üretildi! Private key'i indirip güvenli yere kaydet.");
    } catch (e: any) {
      toast.error(e.message || "Üretim başarısız");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPriv = () => {
    if (!generatedPriv) return;
    const blob = new Blob([generatedPriv], { type: "application/pgp-keys" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `private-key-${Date.now()}.asc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-lg p-4 text-xs font-mono text-muted-foreground">
        PGP kasası yükleniyor...
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-5 space-y-4 neon-border">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-mono font-bold text-foreground">PGP Anahtar Kasası</h2>
        {stored && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/10 text-green-400">
            <ShieldCheck className="w-3 h-3" /> AKTİF
          </span>
        )}
      </div>
      <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
        Public key'in profilinde görünür. Sipariş verdiğinde adres ve notların satıcının PGP
        anahtarı ile <span className="text-primary">otomatik şifrelenir</span> — sunucu içeriği
        görmez.
      </p>

      {stored ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 bg-secondary/40 rounded p-3 border border-primary/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">FINGERPRINT</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(stored.fingerprint);
                toast.success("Fingerprint kopyalandı");
              }}
              className="text-[10px] text-primary hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              kopyala
            </button>
          </div>
          <div className="font-mono text-xs text-primary break-all">
            {formatFingerprint(stored.fingerprint)}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>Key ID: {stored.key_id}</span>
            <span>{new Date(stored.created_at).toLocaleDateString("tr-TR")}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(stored.public_key);
                toast.success("Public key kopyalandı");
              }}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] font-mono py-1.5 rounded bg-secondary border border-border hover:border-primary"
            >
              <Copy className="w-3 h-3" /> Public Key
            </button>
            <button
              onClick={remove}
              className="flex items-center gap-1 text-[11px] font-mono py-1.5 px-3 rounded bg-destructive/10 border border-destructive/40 text-destructive hover:bg-destructive/20"
            >
              <Trash2 className="w-3 h-3" /> Sil
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="flex gap-2 text-[11px] font-mono">
            <button
              onClick={() => setMode("import")}
              className={`px-3 py-1 rounded ${mode === "import" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              İçe Aktar
            </button>
            <button
              onClick={() => setMode("generate")}
              className={`px-3 py-1 rounded flex items-center gap-1 ${mode === "generate" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              <Sparkles className="w-3 h-3" /> Yeni Üret
            </button>
          </div>

          {mode === "generate" && (
            <div className="space-y-2 bg-secondary/40 rounded p-3 border border-border">
              <div className="flex items-start gap-2 text-[10px] font-mono text-yellow-400">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Üretilen private key tarayıcında oluşur, sunucuya gitmez. İndir ve{" "}
                  <span className="text-primary">güvenli bir yerde sakla</span>. Kaybedersen geri
                  alınamaz.
                </span>
              </div>
              <input
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                placeholder="Operatör adı (anonim olabilir)"
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
              <input
                value={genEmail}
                onChange={(e) => setGenEmail(e.target.value)}
                placeholder="email (sahte olabilir, ör: op@anon.io)"
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
              <input
                value={genPass}
                onChange={(e) => setGenPass(e.target.value)}
                type="password"
                placeholder="Private key parolası (min 8)"
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
              <button
                onClick={generate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-primary text-primary-foreground text-xs font-mono disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}{" "}
                ed25519 Anahtar Çifti Üret
              </button>
              {generatedPriv && (
                <button
                  onClick={downloadPriv}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs font-mono"
                >
                  <Download className="w-3 h-3" /> Private Key'i İndir (.asc)
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground">
              PUBLIC KEY (ARMORED)
            </label>
            <textarea
              value={armored}
              onChange={(e) => setArmored(e.target.value)}
              rows={6}
              placeholder={
                "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----"
              }
              className="w-full bg-background border border-border rounded px-2 py-2 text-[10px] font-mono focus:outline-none focus:border-primary resize-none"
            />
            {parseError && (
              <div className="text-[10px] font-mono text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {parseError}
              </div>
            )}
            {info && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-500/5 border border-green-500/30 rounded p-2 space-y-1"
              >
                <div className="flex items-center gap-1 text-[10px] font-mono text-green-400">
                  <ShieldCheck className="w-3 h-3" /> Geçerli anahtar
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  FP: <span className="text-foreground">{formatFingerprint(info.fingerprint)}</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {info.algorithm.toUpperCase()} {info.bits ? `${info.bits}-bit` : ""} •{" "}
                  {info.userIds.join(", ") || "—"}
                </div>
              </motion.div>
            )}
            <button
              onClick={save}
              disabled={!info || saving}
              className="w-full flex items-center justify-center gap-2 py-2 rounded bg-primary text-primary-foreground text-xs font-mono neon-glow-btn disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}{" "}
              Kasaya Kaydet
            </button>
          </div>
        </>
      )}
    </div>
  );
}
