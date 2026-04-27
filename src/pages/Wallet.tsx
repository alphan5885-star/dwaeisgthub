import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Balance = { available: number; pending: number; total: number };
const FALLBACK_XMR_ADDRESS =
  "49VZg8Rqy31LHQpy1rdHFgawh4dcErZEaREXSrqEqivJaPLxGE6Srk8cXoxdWdfSm9c4uduESinA55PCd3reZoov8SSvTXD";

export default function Wallet() {
  const [ltcAddress, setLtcAddress] = useState<string>("");
  const [xmrAddress] = useState<string>(FALLBACK_XMR_ADDRESS);
  const [balance, setBalance] = useState<Balance>({ available: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const ensureDepositAddress = async () => {
    const { data, error } = await supabase.functions.invoke("create-deposit-address", { body: {} });
    if (error || !data?.address) {
      throw new Error(error?.message || "LTC adresi oluşturulamadı");
    }
    setLtcAddress(data.address);
  };

  const refreshBalance = async (showToast = false) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-deposits", { body: {} });
      if (error) throw new Error(error.message);
      if (data?.balance) {
        setBalance({
          available: Number(data.balance.available || 0),
          pending: Number(data.balance.pending || 0),
          total: Number(data.balance.total || 0),
        });
      }
      if (showToast) {
        toast.success(
          data?.credited
            ? `${data.credited} yeni transfer onaylandı ve bakiyene eklendi.`
            : "Yeni onaylı transfer bulunamadı.",
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await ensureDepositAddress();
        await refreshBalance(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Cüzdan yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Adres panoya kopyalandı");
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-mono font-bold text-primary neon-text">Wallet</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            LTC deposit adresine para yatir, 3 onaydan sonra bakiyene otomatik yansir
          </p>
        </div>

        <div className="glass-card neon-border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded border border-border p-3 bg-background/40">
              <div className="text-[10px] text-muted-foreground font-mono">Kullanilabilir</div>
              <div className="text-lg font-mono text-primary">
                {balance.available.toFixed(8)} LTC
              </div>
            </div>
            <div className="rounded border border-border p-3 bg-background/40">
              <div className="text-[10px] text-muted-foreground font-mono">Bekleyen</div>
              <div className="text-lg font-mono text-foreground">
                {balance.pending.toFixed(8)} LTC
              </div>
            </div>
            <div className="rounded border border-border p-3 bg-background/40">
              <div className="text-[10px] text-muted-foreground font-mono">Toplam</div>
              <div className="text-lg font-mono text-foreground">
                {balance.total.toFixed(8)} LTC
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => refreshBalance(true)}
              size="sm"
              variant="outline"
              disabled={syncing || loading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
              BlockCypher ile Yenile
            </Button>
          </div>

          <h2 className="font-mono text-sm text-foreground">LTC Adresi</h2>
          <div className="flex flex-col items-center gap-3 p-4 bg-background/40 rounded">
            <div className="bg-white p-3 rounded">
              <QRCodeCanvas value={ltcAddress || "loading"} size={160} />
            </div>
            <div className="w-full flex items-center gap-2">
              <code className="flex-1 text-xs font-mono break-all bg-background/60 px-2 py-1.5 rounded border border-border text-primary">
                {ltcAddress || "Adres olusturuluyor..."}
              </code>
              <Button
                onClick={() => ltcAddress && copy(ltcAddress)}
                size="sm"
                variant="outline"
                disabled={!ltcAddress}
                className="shrink-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <h2 className="font-mono text-sm text-foreground">XMR (Monero) Adresi</h2>
          <div className="flex flex-col items-center gap-3 p-4 bg-background/40 rounded">
            <div className="bg-white p-3 rounded">
              <QRCodeCanvas value={xmrAddress} size={160} />
            </div>
            <div className="w-full flex items-center gap-2">
              <code className="flex-1 text-xs font-mono break-all bg-background/60 px-2 py-1.5 rounded border border-border text-primary">
                {xmrAddress}
              </code>
              <Button
                onClick={() => copy(xmrAddress)}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-2 rounded bg-destructive/10 border border-destructive/40 text-xs font-mono text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Ödeme yapmadan önce ağ türünü doğrula. Yanlış ağa gönderilen transferler geri
              alınamaz.
            </span>
          </div>
          <div className="flex items-start gap-2 px-3 py-2 rounded bg-primary/10 border border-primary/40 text-xs font-mono text-primary">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              LTC transferleri BlockCypher'da 3 onay aldiginda otomatik bakiyene eklenir. Satin
              alimda bakiye escrowa kilitlenir; teslimatta %90 saticiya, %10 admin hesaba aktarilir.
            </span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
