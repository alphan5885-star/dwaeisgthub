import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Wallet, Clock, CheckCircle, Percent, TrendingUp, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface WalletData {
  pending: number;
  available: number;
  commission: number;
  total: number;
}

interface OrderSummary {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalCommission: number;
}

export default function VendorWalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData>({ pending: 0, available: 0, commission: 0, total: 0 });
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({ totalOrders: 0, completedOrders: 0, pendingOrders: 0, totalRevenue: 0, totalCommission: 0 });
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      // Wallet data
      const { data: walletData } = await supabase.from("vendor_wallets").select("*").eq("vendor_id", user.id).single();
      if (walletData) setWallet({ pending: Number(walletData.pending), available: Number(walletData.available), commission: Number(walletData.commission), total: Number(walletData.total) });

      // Orders summary
      const { data: orders } = await supabase.from("orders").select("id, amount, status, service_fee, created_at, product_id").eq("vendor_id", user.id).order("created_at", { ascending: false });
      if (orders) {
        const completed = orders.filter(o => o.status === "completed" || o.status === "delivered");
        const pending = orders.filter(o => o.status === "paid" || o.status === "pending");
        const totalRev = completed.reduce((s, o) => s + Number(o.amount), 0);
        const totalComm = orders.reduce((s, o) => s + Number((o as any).service_fee || 0), 0);
        setOrderSummary({
          totalOrders: orders.length,
          completedOrders: completed.length,
          pendingOrders: pending.length,
          totalRevenue: totalRev,
          totalCommission: totalComm,
        });
        setRecentOrders(orders.slice(0, 10));
      }
    };
    fetchAll();
  }, [user]);

  const handleWithdraw = () => {
    if (!withdrawAddr || !withdrawAmount) return;
    toast.success(`${withdrawAmount} LTC çekim talebi oluşturuldu.`);
    setWithdrawAddr("");
    setWithdrawAmount("");
  };

  const statCards = [
    { label: "Bekleyen Bakiye", value: wallet.pending, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { label: "Çekilebilir Bakiye", value: wallet.available, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Sistem Kesintisi (%5)", value: orderSummary.totalCommission, icon: Percent, color: "text-primary", bg: "bg-primary/10" },
    { label: "Toplam Kazanç", value: orderSummary.totalRevenue, icon: TrendingUp, color: "text-foreground", bg: "bg-secondary" },
  ];

  const orderStatCards = [
    { label: "Toplam Sipariş", value: orderSummary.totalOrders, icon: Package },
    { label: "Tamamlanan", value: orderSummary.completedOrders, icon: CheckCircle },
    { label: "Bekleyen", value: orderSummary.pendingOrders, icon: Clock },
  ];

  return (
    <PageShell>
      <h1 className="text-xl font-mono font-bold text-primary neon-text mb-6">Satıcı Paneli</h1>

      {/* Wallet Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {statCards.map((item) => (
          <div key={item.label} className="glass-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
              <div className={`p-1.5 rounded ${item.bg}`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            <div className={`text-3xl font-mono font-bold ${item.color}`}>{item.value.toFixed(2)} <span className="text-sm">LTC</span></div>
          </div>
        ))}
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {orderStatCards.map((item) => (
          <div key={item.label} className="glass-card rounded-lg p-4 text-center">
            <item.icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <div className="text-2xl font-mono font-bold text-foreground">{item.value}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="glass-card rounded-lg p-4 mb-6">
          <h2 className="text-sm font-mono text-muted-foreground mb-3">Son Siparişler</h2>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-xs font-mono text-foreground">#{order.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("tr-TR")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-primary">{Number(order.amount).toFixed(2)} LTC</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    order.status === "completed" || order.status === "delivered" ? "bg-green-500/10 text-green-500" :
                    order.status === "paid" ? "bg-blue-500/10 text-blue-400" :
                    order.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {order.status === "completed" ? "Tamamlandı" :
                     order.status === "delivered" ? "Teslim Edildi" :
                     order.status === "paid" ? "Ödendi" :
                     order.status === "pending" ? "Beklemede" : order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw */}
      <div className="glass-card rounded-lg p-4">
        <h2 className="text-sm font-mono text-muted-foreground mb-3">Çekim Talebi</h2>
        <div className="flex gap-3">
          <input value={withdrawAddr} onChange={(e) => setWithdrawAddr(e.target.value)} placeholder="LTC Cüzdan Adresi" className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Miktar" type="number" step="0.01" className="w-32 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <button onClick={handleWithdraw} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono rounded font-bold neon-glow-btn">Çek</button>
        </div>
      </div>
    </PageShell>
  );
}
