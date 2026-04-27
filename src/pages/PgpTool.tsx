import { useState } from "react";
import PageShell from "@/components/PageShell";
import { Shield, CheckCircle, XCircle, Key, Lock, Unlock, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { verifySignature, encryptForRecipient } from "@/lib/pgp";
import { motion } from "framer-motion";

export default function PgpTool() {
  const [activeTab, setActiveTab] = useState<"verify" | "encrypt">("verify");

  // Verify state
  const [signedMsg, setSignedMsg] = useState("");
  const [pubKey, setPubKey] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    data: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Encrypt state
  const [plaintext, setPlaintext] = useState("");
  const [encryptPubKey, setEncryptPubKey] = useState("");
  const [encryptedMsg, setEncryptedMsg] = useState("");
  const [encrypting, setEncrypting] = useState(false);

  const handleVerify = async () => {
    if (!signedMsg || !pubKey) {
      toast.error("İmzalı mesaj ve kamu anahtarı gereklidir.");
      return;
    }
    setVerifying(true);
    try {
      const result = await verifySignature(signedMsg, pubKey);
      setVerificationResult(result);
      if (result.verified) toast.success("İmza doğrulandı!");
      else toast.error("İmza doğrulanmadı!");
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleEncrypt = async () => {
    if (!plaintext || !encryptPubKey) {
      toast.error("Mesaj ve kamu anahtarı gereklidir.");
      return;
    }
    setEncrypting(true);
    try {
      const encrypted = await encryptForRecipient(plaintext, encryptPubKey);
      setEncryptedMsg(encrypted);
      toast.success("Mesaj şifrelendi.");
    } catch (e: any) {
      toast.error("Şifreleme hatası: " + e.message);
    } finally {
      setEncrypting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı.");
  };

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary neon-glow" />
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground">PGP Toolkit</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Yerel tarayıcı tabanlı PGP araçları
              </p>
            </div>
          </div>
          <div className="flex bg-secondary p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab("verify")}
              className={`px-4 py-1.5 text-xs font-mono rounded transition-all ${activeTab === "verify" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
            >
              Doğrula
            </button>
            <button
              onClick={() => setActiveTab("encrypt")}
              className={`px-4 py-1.5 text-xs font-mono rounded transition-all ${activeTab === "encrypt" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
            >
              Şifrele
            </button>
          </div>
        </div>

        {activeTab === "verify" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="space-y-4">
              <div className="glass-card p-6 border border-border rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-sm font-mono text-primary">
                  <CheckCircle className="w-4 h-4" />
                  <span>İmza Doğrulama</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">
                    İmzalı Mesaj (Cleartext Message)
                  </label>
                  <textarea
                    value={signedMsg}
                    onChange={(e) => setSignedMsg(e.target.value)}
                    className="w-full h-40 bg-background/50 border border-border rounded p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="-----BEGIN PGP SIGNED MESSAGE-----..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">
                    Gönderen Kamu Anahtarı (Public Key)
                  </label>
                  <textarea
                    value={pubKey}
                    onChange={(e) => setPubKey(e.target.value)}
                    className="w-full h-40 bg-background/50 border border-border rounded p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
                  />
                </div>

                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="w-full py-3 bg-primary text-primary-foreground font-mono text-sm rounded neon-glow-btn flex items-center justify-center gap-2"
                >
                  {verifying ? "İşleniyor..." : "İmzayı Doğrula"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-6 border border-border rounded-lg min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Doğrulama Sonucu</span>
                  </div>
                  {verificationResult && (
                    <button
                      onClick={() => setVerificationResult(null)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {verificationResult ? (
                  <div className="flex-1 space-y-6">
                    <div
                      className={`p-4 rounded border flex items-center gap-4 ${verificationResult.verified ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-destructive/10 border-destructive/30 text-destructive"}`}
                    >
                      {verificationResult.verified ? (
                        <CheckCircle className="w-10 h-10" />
                      ) : (
                        <XCircle className="w-10 h-10" />
                      )}
                      <div>
                        <div className="font-mono font-bold text-sm">
                          {verificationResult.verified ? "GEÇERLİ İMZA" : "GEÇERSİZ İMZA"}
                        </div>
                        <div className="text-[10px] opacity-80 uppercase tracking-tighter">
                          İmza{" "}
                          {verificationResult.verified
                            ? "doğrulandı ve verinin değişmediği onaylandı."
                            : "doğrulanamadı! Veri manipüle edilmiş olabilir."}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase">
                          Orijinal Veri
                        </label>
                        <button
                          onClick={() => copy(verificationResult.data)}
                          className="p-1 text-muted-foreground hover:text-primary"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="w-full bg-secondary/50 border border-border rounded p-4 text-xs font-mono whitespace-pre-wrap break-all max-h-[300px] overflow-auto">
                        {verificationResult.data}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
                    <Shield className="w-12 h-12 text-muted-foreground/20" />
                    <p className="text-xs font-mono text-muted-foreground">
                      Henüz bir doğrulama yapılmadı. Sol tarafa imzalı mesajı ve anahtarı
                      yapıştırın.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="space-y-4">
              <div className="glass-card p-6 border border-border rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-sm font-mono text-primary">
                  <Lock className="w-4 h-4" />
                  <span>Mesaj Şifreleme</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">
                    Düz Metin (Plaintext)
                  </label>
                  <textarea
                    value={plaintext}
                    onChange={(e) => setPlaintext(e.target.value)}
                    className="w-full h-40 bg-background/50 border border-border rounded p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="Şifrelenecek mesaj..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">
                    Alıcı Kamu Anahtarı (Public Key)
                  </label>
                  <textarea
                    value={encryptPubKey}
                    onChange={(e) => setEncryptPubKey(e.target.value)}
                    className="w-full h-40 bg-background/50 border border-border rounded p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
                  />
                </div>

                <button
                  onClick={handleEncrypt}
                  disabled={encrypting}
                  className="w-full py-3 bg-primary text-primary-foreground font-mono text-sm rounded neon-glow-btn flex items-center justify-center gap-2"
                >
                  {encrypting ? "Şifreleniyor..." : "Mesajı Şifrele"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-6 border border-border rounded-lg min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Şifrelenmiş Çıktı</span>
                  </div>
                  {encryptedMsg && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => copy(encryptedMsg)}
                        className="p-1 text-muted-foreground hover:text-primary"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEncryptedMsg("")}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {encryptedMsg ? (
                  <div className="flex-1 flex flex-col">
                    <textarea
                      readOnly
                      value={encryptedMsg}
                      className="flex-1 w-full bg-secondary/50 border border-border rounded p-4 text-[10px] font-mono focus:outline-none resize-none"
                    />
                    <p className="text-[9px] text-muted-foreground mt-3 italic font-mono uppercase">
                      Bu mesajı sadece alıcı kendi özel anahtarı (private key) ile açabilir.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
                    <Lock className="w-12 h-12 text-muted-foreground/20" />
                    <p className="text-xs font-mono text-muted-foreground">
                      Şifrelenmiş mesaj burada görünecek. Sol taraftaki alanları doldurun.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
