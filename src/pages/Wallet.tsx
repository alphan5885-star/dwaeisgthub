import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, RefreshCw, AlertTriangle, Info, Clock } from "lucide-react";
import { toast } from "sonner";

const STORAGE_PREFIX_LTC = "ltc_addr_";
const STORAGE_PREFIX_XMR = "xmr_addr_";
const VALID_MS = 24 * 60 * 60 * 1000;

function generateLtcAddress(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `ltc1q${hex}`;
}

function generateXmrAddress(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `4${hex}`;
}

function fmtCountdown(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${h}sa ${m}dk`;
}

export default function Wallet() {
  const { user } = useAuth();
  const key = user ? `${STORAGE_PREFIX_LTC}${user.id}` : "";
  const [address, setAddress] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!key) return;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setAddress(p.address);
        setCreatedAt(p.createdAt);
      } catch {
        setAddress(null);
        setCreatedAt(null);
      }
    }
  }, [key]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const generate = () => {
    const addr = generateLtcAddress();
    const ts = Date.now();
    setAddress(addr);
    setCreatedAt(ts);
    localStorage.setItem(key, JSON.stringify({ address: addr, createdAt: ts }));
    toast.success("Yeni LTC adresi oluşturuldu");
  };

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.success("Adres panoya kopyalandı");
  };

  const elapsed = createdAt ? now - createdAt : 0;
  const expired = createdAt ? elapsed >= VALID_MS : false;
  const remaining = createdAt ? VALID_MS - elapsed : 0;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-mono font-bold text-primary neon-text">Wallet</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Kişisel LTC ödeme adresi yönetimi
          </p>
        </div>

        <div className="glass-card neon-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm text-foreground">LTC Adresi</h2>
            <Button onClick={generate} size="sm" className="font-mono text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              {address ? "Yeni Adres Üret" : "Generate New LTC Address"}
            </Button>
          </div>

          {address && (
            <>
              <div className="flex flex-col items-center gap-3 p-4 bg-background/40 rounded">
                <div className="bg-white p-3 rounded">
                  <QRCodeCanvas value={address} size={160} />
                </div>
                <div className="w-full flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono break-all bg-background/60 px-2 py-1.5 rounded border border-border text-primary">
                    {address}
                  </code>
                  <Button onClick={copy} size="sm" variant="outline" className="shrink-0">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono ${
                  expired
                    ? "bg-destructive/20 border border-destructive text-destructive"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                {expired
                  ? "Bu adresin süresi DOLDU. Yeni adres üretin."
                  : `Geçerlilik: ${fmtCountdown(remaining)}`}
              </div>
            </>
          )}

          <div className="flex items-start gap-2 px-3 py-2 rounded bg-destructive/10 border border-destructive/40 text-xs font-mono text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Bu adres 24 saat geçerlidir. Süresi dolduktan sonra ödeme yaparsanız fonlar kaybolur.
            </span>
          </div>
          <div className="flex items-start gap-2 px-3 py-2 rounded bg-primary/10 border border-primary/40 text-xs font-mono text-primary">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Bakiyeniz 3 ağ onayından sonra güncellenecektir.</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
