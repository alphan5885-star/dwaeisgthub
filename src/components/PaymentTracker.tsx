import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Coins } from "lucide-react";
import { toast } from "sonner";
import OrderChatRoom from "./OrderChatRoom";

interface Props {
  orderId: string;
  amount: number;
}

export default function PaymentTracker({ orderId, amount }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [status, setStatus] = useState<string>("loading");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // 1. Generate fallback address on mount (XMR is manual escrow until a dedicated node is connected)
  useEffect(() => {
    const init = async () => {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke("create-payment-address", { body: { order_id: orderId } });
      if (error || !data?.address) {
        toast.error("Fallback ödeme adresi oluşturulamadı");
        setStatus("error");
      } else {
        setAddress(data.address);
        setStatus("awaiting_manual_xmr");
      }
      setGenerating(false);
    };
    init();
  }, [orderId]);

  // 2. Poll every 30s
  useEffect(() => {
    if (!address || status === "confirmed") return;
    const poll = async () => {
      const { data } = await supabase.functions.invoke("check-payment-status", { body: { order_id: orderId } });
      if (data) {
        setConfirmations(data.confirmations || 0);
        setStatus(data.status || "awaiting_manual_xmr");
      }
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, [address, orderId, status]);

  // 3. Once confirmed, fetch chat room id
  useEffect(() => {
    if (status !== "confirmed") return;
    supabase.from("order_chat_rooms").select("id").eq("order_id", orderId).maybeSingle().then(({ data }) => {
      if (data) setRoomId(data.id);
    });
  }, [status, orderId]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Adres kopyalandı");
  };

  if (generating) {
    return (
      <div className="glass-card rounded-lg p-6 text-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
        <p className="text-sm font-mono text-muted-foreground">XMR-first escrow ekranı hazırlanıyor…</p>
      </div>
    );
  }

  if (status === "confirmed" && roomId) {
    return (
      <div className="space-y-3">
        <div className="glass-card rounded-lg p-4 border border-green-500/40 bg-green-500/10">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-mono text-sm font-bold">Ödeme onaylandı (3/3)</span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-1">Operasyon DM aşağıda açıldı. 24 saat sonra otomatik imha edilir.</p>
        </div>
        <OrderChatRoom roomId={roomId} />
      </div>
    );
  }

  return (
      <div className="glass-card rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-sm font-bold text-primary">XMR Escrow Bekleniyor</h3>
        <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-mono text-primary">
          <Coins className="w-3 h-3" /> MONERO-FIRST
        </span>
      </div>

      <div className="rounded border border-primary/25 bg-primary/10 p-3 text-xs font-mono text-foreground">
        <div className="flex items-center gap-2 font-bold text-primary mb-1">
          <ShieldCheck className="w-4 h-4" /> Manuel doğrulamalı XMR escrow
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Bu sipariş XMR öncelikli işaretlendi. Gerçek Monero node/subaddress bağlanana kadar otomatik onay gösterilmez; admin manuel doğrulama sonrası operasyon DM açar.
        </p>
      </div>

      {address && (
        <>
          <div className="flex justify-center bg-secondary p-3 rounded">
            <QRCodeSVG value={`litecoin:${address}?amount=${amount}`} size={140} bgColor="transparent" fgColor="hsl(var(--foreground))" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-muted-foreground">LTC fallback adresi (XMR yoksa, 24h geçerli)</label>
            <div className="flex gap-2">
              <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5 break-all">{address}</code>
              <button onClick={copy} className="p-1.5 rounded border border-border hover:border-primary"><Copy className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="bg-background/60 border border-border rounded p-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tutar:</span>
              <span className="text-primary font-bold">{amount} LTC fallback</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Onay:</span>
              <span className={`font-bold ${confirmations >= 3 ? "text-green-500" : "text-yellow-500"}`}>{Math.min(confirmations, 3)}/3</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1.5 bg-destructive/10 border border-destructive/40 rounded text-[10px] font-mono text-destructive">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            XMR manuel doğrulama tamamlanmadan sipariş onaylandı sayılmaz. Fallback adres süresi dolduktan sonra ödeme yapma.
          </div>

          <p className="text-[10px] font-mono text-muted-foreground text-center">
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            Fallback zincir canlı izleniyor (30sn) • XMR için manuel escrow doğrulaması gerekir
          </p>
        </>
      )}
    </div>
  );
}
