import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Shield, Lock, AlertTriangle, Wallet, Clock, DollarSign, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

export default function VendorBond() {
  const { user } = useAuth();
  const [bond, setBond] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [depositAddress] = useState(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let addr = "ltc1q";
    for (let i = 0; i < 38; i++) addr += chars[Math.floor(Math.random() * chars.length)];
    return addr;
  });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("vendor_bonds").select("*").eq("vendor_id", user.id).single();
      if (data) setBond(data);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const createBond = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("vendor_bonds").insert({
      vendor_id: user.id,
      amount: 0,
      status: "pending",
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    setBond(data);
    toast.success("Depozito talebi oluşturuldu!");
  };

  if (loading) return <PageShell><div className="text-muted-foreground font-mono animate-pulse">Yükleniyor...</div></PageShell>;

  return (
    <PageShell>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Güven Depozitosu</h1>

        {!bond ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-lg p-6 text-center neon-border">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
            <h2 className="text-sm font-mono font-bold text-foreground mb-2">Satıcı Depozitosu Gerekli</h2>
            <p className="text-xs text-muted-foreground font-mono mb-4">
              Ürün listeleyebilmek için <span className="text-primary">0.5 LTC</span> güven depozitosu yatırmanız gerekmektedir.
              Bu miktar hesabınızda kilitli tutulur ve güvenilirliğinizi garanti eder.
            </p>
            <button onClick={createBond} className="px-6 py-2.5 bg-primary text-primary-foreground font-mono text-sm rounded neon-glow-btn">
              Depozito Yatır
            </button>
          </motion.div>
        ) : (
          <>
            <div className="glass-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-foreground">Depozito Durumu</span>
                <span className={`text-[10px] font-mono px-2 py-1 rounded ${
                  bond.status === "active" ? "bg-green-500/10 text-green-500" :
                  bond.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  {bond.status === "active" ? "AKTİF" : bond.status === "pending" ? "BEKLENİYOR" : "İPTAL"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary rounded-lg p-4">
                  <div className="text-xs text-muted-foreground font-mono mb-1">Yatırılan</div>
                  <div className="text-xl font-mono font-bold text-foreground">{bond.amount} LTC</div>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <div className="text-xs text-muted-foreground font-mono mb-1">Gerekli</div>
                  <div className="text-xl font-mono font-bold text-primary">{bond.required_amount} LTC</div>
                </div>
              </div>
            </div>

            {bond.status === "pending" && (
              <div className="glass-card rounded-lg p-6 neon-border text-center">
                <p className="text-xs text-muted-foreground font-mono mb-3">
                  Aşağıdaki adrese <span className="text-primary">{bond.required_amount} LTC</span> gönderin:
                </p>
                <div className="inline-block p-3 bg-secondary rounded-lg mb-3">
                  <QRCodeSVG value={`litecoin:${depositAddress}?amount=${bond.required_amount}`} size={140} bgColor="transparent" fgColor="#d9d9d9" />
                </div>
                <div className="bg-secondary rounded px-3 py-2 text-xs font-mono text-foreground break-all">
                  <Lock className="w-3 h-3 inline mr-1 text-primary" />{depositAddress}
                </div>
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-yellow-500 font-mono">
                  <Clock className="w-3 h-3" /> Ödeme onayı bekleniyor...
                </div>
              </div>
            )}
          </>
        )}

        <div className="glass-card rounded-lg p-4">
          <h3 className="text-xs font-mono font-bold text-foreground mb-2">Depozito Kuralları</h3>
          <ul className="space-y-1.5 text-[10px] text-muted-foreground font-mono">
            <li>• Depozito, satıcı hesabında kilitli tutulur</li>
            <li>• Kural ihlali durumunda depozito el konulabilir</li>
            <li>• Aktif ürünler varken depozito çekilemez</li>
            <li>• Minimum depozito: 0.5 LTC</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
