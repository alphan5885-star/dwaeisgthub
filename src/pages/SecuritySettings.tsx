import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Shield, Lock, Fingerprint, Save, Eye, EyeOff, Smartphone, Check, X, Loader2, Copy, Skull, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

export default function SecuritySettings() {
  const { user } = useAuth();
  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  // 2FA states
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ id: string; uri: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [deadManEnabled, setDeadManEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase.from("anti_phishing_codes").select("code").eq("user_id", user.id).maybeSingle();
      if (data) setSavedCode(data.code);
      await loadMfaFactors();
      setDeadManEnabled(localStorage.getItem("dead-man-mode") === "armed");
    };
    fetchData();
  }, [user]);

  const loadMfaFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    if (data) {
      setMfaFactors(data.totp || []);
    }
  };

  const saveAntiPhishing = async () => {
    if (!user || !antiPhishingCode.trim()) return;
    const code = antiPhishingCode.trim();
    if (savedCode) {
      await supabase.from("anti_phishing_codes").update({ code }).eq("user_id", user.id);
    } else {
      await supabase.from("anti_phishing_codes").insert({ user_id: user.id, code });
    }
    setSavedCode(code);
    setAntiPhishingCode("");
    toast.success("Anti-phishing kodunuz kaydedildi!");
  };

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "aeigsthub-2fa" });
    if (error) {
      toast.error(error.message);
      setEnrolling(false);
      return;
    }
    setEnrollData({ id: data.id, uri: data.totp.uri, secret: data.totp.secret });
    setEnrolling(false);
  };

  const confirmEnroll = async () => {
    if (!enrollData || verifyCode.length !== 6) return;
    setVerifying(true);
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
    if (challengeErr) {
      toast.error(challengeErr.message);
      setVerifying(false);
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId: enrollData.id, challengeId: challenge.id, code: verifyCode });
    if (verifyErr) {
      toast.error("Kod yanlış. Tekrar deneyin.");
      setVerifying(false);
      return;
    }
    toast.success("2FA başarıyla etkinleştirildi! 🔒");
    setEnrollData(null);
    setVerifyCode("");
    setVerifying(false);
    await loadMfaFactors();
  };

  const unenrollFactor = async (factorId: string) => {
    setUnenrolling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("2FA devre dışı bırakıldı.");
    }
    setUnenrolling(false);
    await loadMfaFactors();
  };

  const verifiedFactors = mfaFactors.filter(f => f.status === "verified");
  const hasActive2FA = verifiedFactors.length > 0;

  const toggleDeadMan = () => {
    const next = !deadManEnabled;
    setDeadManEnabled(next);
    localStorage.setItem("dead-man-mode", next ? "armed" : "off");
    toast.success(next ? "Dead-Man Mode hazırlandı" : "Dead-Man Mode kapatıldı");
  };

  const emergencyWipe = async () => {
    sessionStorage.clear();
    localStorage.removeItem("dead-man-mode");
    setDeadManEnabled(false);
    await supabase.auth.signOut();
    toast.success("Hassas oturum verileri temizlendi");
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Güvenlik Ayarları</h1>

        {/* Anti-Phishing Code */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-lg p-6 neon-border">
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-mono font-bold text-foreground">Anti-Phishing Kodu</h2>
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            Giriş sayfasında size özel bir kelime gösterilir. Bu kelimeyi görmezseniz, sahte sitede olabilirsiniz.
          </p>
          {savedCode && (
            <div className="bg-secondary rounded-lg p-3 mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground font-mono mb-1">Mevcut Kodunuz:</div>
                <div className="text-sm font-mono font-bold text-primary">
                  {showCode ? savedCode : "••••••••"}
                </div>
              </div>
              <button onClick={() => setShowCode(!showCode)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input value={antiPhishingCode} onChange={(e) => setAntiPhishingCode(e.target.value)} placeholder="Gizli kelime belirle (ör: MorKedi42)" className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" maxLength={30} />
            <button onClick={saveAntiPhishing} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono rounded neon-glow-btn flex items-center gap-1">
              <Save className="w-3 h-3" /> Kaydet
            </button>
          </div>
        </motion.div>

        {/* 2FA TOTP */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-lg p-6 neon-border">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-mono font-bold text-foreground">İki Faktörlü Doğrulama (2FA)</h2>
          </div>

          {hasActive2FA ? (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-sm font-mono text-green-400 font-bold">2FA Aktif</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Google Authenticator ile korunuyor</div>
                </div>
              </div>
              {verifiedFactors.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono text-foreground">{f.friendly_name || "TOTP"}</span>
                  </div>
                  <button
                    onClick={() => unenrollFactor(f.id)}
                    disabled={unenrolling}
                    className="px-3 py-1 bg-destructive/20 text-destructive text-[10px] font-mono rounded hover:bg-destructive/30 flex items-center gap-1"
                  >
                    {unenrolling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Kaldır
                  </button>
                </div>
              ))}
            </div>
          ) : enrollData ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-mono">
                Google Authenticator veya başka bir TOTP uygulamasıyla QR kodu tarayın:
              </p>
              <div className="flex justify-center bg-white rounded-lg p-4 w-fit mx-auto">
                <QRCodeSVG value={enrollData.uri} size={180} />
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground font-mono mb-1">Manuel giriş anahtarı:</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary break-all">{enrollData.secret}</code>
                  <button onClick={() => { navigator.clipboard.writeText(enrollData.secret); toast.success("Kopyalandı!"); }} className="text-muted-foreground hover:text-foreground">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-1 block">DOĞRULAMA KODU (6 HANE)</label>
                <div className="flex gap-2">
                  <input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="flex-1 bg-secondary border border-border rounded px-3 py-2.5 text-center text-lg font-mono text-foreground tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={6}
                  />
                  <button
                    onClick={confirmEnroll}
                    disabled={verifyCode.length !== 6 || verifying}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono rounded neon-glow-btn disabled:opacity-50 flex items-center gap-1"
                  >
                    {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Doğrula
                  </button>
                </div>
              </div>
              <button onClick={() => { setEnrollData(null); setVerifyCode(""); }} className="text-xs text-muted-foreground font-mono hover:text-foreground">
                İptal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-secondary rounded-lg p-4 flex items-center gap-3">
                <Lock className="w-6 h-6 text-yellow-500" />
                <div>
                  <div className="text-sm font-mono text-foreground">2FA Devre Dışı</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1">
                    Google Authenticator ile hesabınızı koruyun
                  </div>
                </div>
              </div>
              <button
                onClick={startEnroll}
                disabled={enrolling}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-mono rounded neon-glow-btn flex items-center justify-center gap-2"
              >
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                2FA Etkinleştir
              </button>
            </div>
          )}
        </motion.div>

        {/* Dead-Man Mode */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-lg p-6 neon-border">
          <div className="flex items-center gap-2 mb-4">
            <Skull className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-mono font-bold text-foreground">Dead-Man / Panic Mode</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-xs font-mono text-foreground mb-1">Oturum imha modu</div>
              <div className="text-[10px] font-mono text-muted-foreground leading-relaxed">Logout, panik çıkış ve inactivity durumunda local/session cache temizliği aktif edilir.</div>
              <button onClick={toggleDeadMan} className="mt-3 w-full py-2 bg-primary text-primary-foreground text-xs font-mono rounded neon-glow-btn flex items-center justify-center gap-2">
                <Power className="w-3.5 h-3.5" /> {deadManEnabled ? "ARMED" : "Etkinleştir"}
              </button>
            </div>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="text-xs font-mono text-destructive mb-1">Panic wipe</div>
              <div className="text-[10px] font-mono text-muted-foreground leading-relaxed">Acil durumda hassas tarayıcı verilerini temizler ve hesabı bu cihazdan çıkarır.</div>
              <button onClick={emergencyWipe} className="mt-3 w-full py-2 bg-destructive text-destructive-foreground text-xs font-mono rounded flex items-center justify-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Hızlı İmha
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono">
            <span className="rounded bg-secondary px-2 py-1 text-green-500">● PGP chat</span>
            <span className="rounded bg-secondary px-2 py-1 text-green-500">● 15dk inactivity</span>
            <span className="rounded bg-secondary px-2 py-1 text-green-500">● Panic logout</span>
          </div>
        </motion.div>

        {/* Encryption Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-mono font-bold text-foreground">Veri Şifreleme</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Mesajlar", desc: "AES-256-GCM E2E şifreli", active: true },
              { label: "Ödeme Adresleri", desc: "30dk benzersiz, tek kullanımlık", active: true },
              { label: "Kişisel Veriler", desc: "RLS ile izole edilmiş", active: true },
              { label: "Loglar", desc: "Panic Button ile imha edilebilir", active: true },
            ].map((item) => (
              <div key={item.label} className="bg-secondary rounded-lg p-3">
                <div className="text-xs font-mono text-foreground">{item.label}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.desc}</div>
                <span className="text-[10px] font-mono text-green-500 mt-1 block">● Korumalı</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}
