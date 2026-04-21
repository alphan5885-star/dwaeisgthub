import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { CheckCircle, Clock, Star, Truck, MapPin, Mail } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import RateOrderDialog from "@/components/RateOrderDialog";
import OrderDeliveryInfo from "@/components/OrderDeliveryInfo";

interface OrderRow {
  id: string;
  amount: number;
  status: string;
  delivery_confirmed: boolean | null;
  delivery_method: string;
  created_at: string;
  products: { name: string; image_url: string | null; image_emoji: string | null; type: string; vendor_id: string } | null;
}

export default function Orders() {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState<{ id: string; vendorId: string; productName: string } | null>(null);
  const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const query = supabase
        .from("orders")
        .select("id, amount, status, delivery_confirmed, delivery_method, created_at, products:product_id(name, image_url, image_emoji, type, vendor_id)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (role === "buyer" || role === "vendor") query.eq("buyer_id", user.id);

      const { data } = await query;
      if (data) setOrders(data as any);

      const { data: ratings } = await supabase.from("vendor_ratings").select("order_id").eq("buyer_id", user.id);
      if (ratings) setRatedOrders(new Set(ratings.map((r: any) => r.order_id)));

      setLoading(false);
    };
    fetch();
  }, [user, role]);

  const confirmDelivery = async (orderId: string) => {
    const { data } = await supabase.rpc("confirm_delivery", { _order_id: orderId });
    if (data && (data as any).success) {
      toast.success("Teslimat onaylandı!");
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, delivery_confirmed: true, status: "completed" } : o));
    } else {
      toast.error((data as any)?.error || "Hata");
    }
  };

  const deliveryIcon = (method: string) => {
    if (method === "dead_drop") return <MapPin className="w-3 h-3" />;
    if (method === "mailbox") return <Mail className="w-3 h-3" />;
    return <Truck className="w-3 h-3" />;
  };

  const statusBadge = (o: OrderRow) => {
    if (o.delivery_confirmed) return <span className="flex items-center gap-1 text-green-500 text-[10px] font-mono"><CheckCircle className="w-3 h-3" />Teslim Edildi</span>;
    if (o.status === "completed") return <span className="flex items-center gap-1 text-green-500 text-[10px] font-mono"><CheckCircle className="w-3 h-3" />Tamamlandı</span>;
    if (o.status === "processing") return <span className="flex items-center gap-1 text-yellow-500 text-[10px] font-mono"><Clock className="w-3 h-3" />İşleniyor</span>;
    return <span className="flex items-center gap-1 text-muted-foreground text-[10px] font-mono"><Clock className="w-3 h-3" />Beklemede</span>;
  };

  if (loading) return <PageShell><div className="text-muted-foreground font-mono animate-pulse">Yükleniyor...</div></PageShell>;

  return (
    <PageShell>
      <h1 className="text-xl font-mono font-bold text-primary neon-text mb-6">Siparişlerim</h1>

      {orders.length === 0 ? (
        <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">Henüz sipariş yok.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass-card rounded-lg p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                <div className="flex items-center gap-3">
                  {o.products?.image_url ? (
                    <img src={o.products.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <span className="text-2xl">{o.products?.image_emoji || "📦"}</span>
                  )}
                  <div>
                    <div className="text-sm font-medium text-foreground">{o.products?.name || "Ürün"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                      {new Date(o.created_at).toLocaleDateString("tr-TR")} • {o.amount} LTC
                      {o.products?.type === "physical" && (
                        <span className="flex items-center gap-1 text-primary">
                          {deliveryIcon(o.delivery_method)}
                          {o.delivery_method === "dead_drop" ? "Dead-Drop" : o.delivery_method === "mailbox" ? "Posta" : "Kargo"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(o)}
                  {role === "buyer" && o.status === "processing" && !o.delivery_confirmed && (
                    <button onClick={(e) => { e.stopPropagation(); confirmDelivery(o.id); }} className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-[10px] font-mono rounded hover:bg-green-700 transition-colors">
                      <CheckCircle className="w-3 h-3" /> Onayla
                    </button>
                  )}
                  {role === "buyer" && o.status === "completed" && !ratedOrders.has(o.id) && o.products && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRatingOrder({ id: o.id, vendorId: o.products!.vendor_id, productName: o.products!.name }); }}
                      className="flex items-center gap-1 px-2 py-1 bg-yellow-600 text-white text-[10px] font-mono rounded hover:bg-yellow-700 transition-colors"
                    >
                      <Star className="w-3 h-3" /> Puanla
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded delivery info */}
              {expandedOrder === o.id && o.products?.type === "physical" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border">
                  <OrderDeliveryInfo orderId={o.id} deliveryMethod={o.delivery_method} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      {ratingOrder && (
        <RateOrderDialog
          orderId={ratingOrder.id}
          vendorId={ratingOrder.vendorId}
          productName={ratingOrder.productName}
          onClose={() => setRatingOrder(null)}
          onRated={() => setRatedOrders((prev) => new Set([...prev, ratingOrder.id]))}
        />
      )}
    </PageShell>
  );
}
