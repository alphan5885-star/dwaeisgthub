import { useEffect, useState, useRef, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useNavigate } from "@/lib/router-shim";
import { Heart, Package } from "lucide-react";
import WatchlistButton from "@/components/WatchlistButton";
import { motion } from "framer-motion";

interface Row {
  id: string;
  product: {
    id: string;
    name: string | null;
    price: number;
    image_emoji: string | null;
    image_url: string | null;
    stock: number | null;
  } | null;
}

export default function Watchlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: w, error: wError } = await supabase
        .from("watchlist")
        .select("id, product_id")
        .eq("user_id", user.id);
      if (!isMounted.current) return;

      if (wError) {
        if (import.meta.env.DEV) console.error("Error loading watchlist ids:", wError);
        setLoading(false);
        return;
      }

      if (!w?.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const ids = w.map((x: any) => x.product_id);
      const { data: products, error: pError } = await supabase
        .from("products")
        .select("id, name, price, image_emoji, image_url, stock")
        .in("id", ids);

      if (!isMounted.current) return;

      if (pError) {
        if (import.meta.env.DEV) console.error("Error loading products for watchlist:", pError);
        setLoading(false);
        return;
      }

      const map = new Map((products || []).map((p: any) => [p.id, p]));
      setItems(w.map((x: any) => ({ id: x.id, product: map.get(x.product_id) || null })));
      setLoading(false);
    } catch (e) {
      if (import.meta.env.DEV) console.error("Catch error in watchlist load:", e);
      if (isMounted.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = () => {
      load();
    };
    window.addEventListener("watchlist:changed", h);
    return () => {
      window.removeEventListener("watchlist:changed", h);
    };
  }, [load]);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-destructive fill-current" />
          <h1 className="text-2xl font-mono font-bold neon-text">Favori Listem</h1>
          <span className="ml-auto text-xs font-mono text-muted-foreground">
            {items.length} ürün
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground font-mono">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="glass-card neon-border rounded-lg p-12 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-mono text-muted-foreground">Henüz favori ürün yok</p>
            <button
              onClick={() => navigate("/market")}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded font-mono text-sm"
            >
              Markete git
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(
              (row, i) =>
                row.product && (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card neon-border rounded-lg p-4 cursor-pointer hover:scale-[1.02] transition-all"
                    onClick={() => navigate(`/product/${row.product!.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-4xl">
                        {row.product.image_url ? (
                          <img
                            src={row.product.image_url}
                            alt=""
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          row.product.image_emoji || "📦"
                        )}
                      </div>
                      <WatchlistButton productId={row.product.id} />
                    </div>
                    <h3 className="font-mono text-sm font-bold text-foreground line-clamp-2">
                      {row.product.name || "Ürün"}
                    </h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-primary font-mono text-sm font-bold">
                        {row.product.price.toFixed(4)} LTC
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Package className="w-3 h-3" /> {row.product.stock ?? 0}
                      </span>
                    </div>
                  </motion.div>
                ),
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
