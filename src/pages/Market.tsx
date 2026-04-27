import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@/lib/router-shim";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import {
  Key,
  Package,
  Search,
  User,
  MapPin,
  Eye,
  Shield,
  Activity,
  TrendingUp,
  Users,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Clock,
  Filter,
  ShoppingCart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VendorRating from "@/components/VendorRating";
import QuickViewModal from "@/components/QuickViewModal";
import WatchlistButton from "@/components/WatchlistButton";

const SERVICE_FEE_RATE = 0.05;
const FIXED_CATEGORIES = ["Dijital Veriler", "Lojistik Rotaları", "VIP Erişim"];

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  image_emoji: string | null;
  image_url: string | null;
  stock: number;
  vendor_id: string;
  category: string | null;
  origin: string | null;
  destination: string | null;
  created_at: string;
}

export default function Market() {
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "digital" | "physical">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modalProduct, setModalProduct] = useState<ProductRow | null>(null);

  const [marketStats, setMarketStats] = useState({
    online: 0,
    orders24h: 0,
    topCategory: "...",
    totalProducts: 0,
    activeVendors: 0,
    volume24h: 0,
    ltcUsd: 84.22, // Fallback
  });

  const [liveActivity, setLiveActivity] = useState<any[]>([]);

  useEffect(() => {
    isMounted.current = true;
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, description, price, type, image_emoji, image_url, stock, vendor_id, category, origin, destination, created_at",
          )
          .gt("stock", 0)
          .order("created_at", { ascending: false });

        if (!isMounted.current) return;

        if (error) {
          if (import.meta.env.DEV) console.error("Error fetching products:", error);
          return;
        }

        if (data) {
          setProducts(data as ProductRow[]);
          // Fetch vendor display names
          const vendorIds = Array.from(new Set(data.map((p: any) => p.vendor_id)));
          const categoryCounts = new Map<string, number>();
          for (const p of data as any[]) {
            if (p.category)
              categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
          }
          const topCategory =
            [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

          if (isMounted.current) {
            setMarketStats((prev) => ({
              ...prev,
              online: 0,
              orders24h: 0,
              topCategory,
              totalProducts: data.length,
              activeVendors: vendorIds.length,
              volume24h: 0,
            }));

            const activity = (data as any[])
              .slice(0, 2)
              .map((p) => ({
                user: `vend***${String(p.vendor_id).substring(0, 3)}`,
                action: "Yeni Ürün",
                item: p.name,
                time: formatRelativeTime(p.created_at),
              }))
              .sort((a, b) => 0.5 - Math.random());

            setLiveActivity(activity);
          }

          if (vendorIds.length) {
            const { data: profiles, error: profileError } = await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", vendorIds);

            if (!isMounted.current) return;

            if (profileError) {
              if (import.meta.env.DEV)
                console.error("Error fetching vendor profiles:", profileError);
              return;
            }

            if (profiles) {
              const map: Record<string, string> = {};
              profiles.forEach((p: any) => {
                map[p.user_id] = p.display_name || "Anonim";
              });
              setVendorNames(map);
            }
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Catch error in Market fetch:", err);
      }
    };
    fetch();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins}dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa önce`;
    return `${Math.floor(hours / 24)}g önce`;
  };

  const categories = FIXED_CATEGORIES;

  const filtered = products.filter((p) => {
    if (filter !== "all" && p.type !== filter) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { icon: Package, label: "Ürün", value: products.length },
    { icon: Users, label: "Kullanıcı", value: marketStats.online },
    { icon: TrendingUp, label: "24h İşlem", value: marketStats.orders24h },
  ];

  return (
    <PageShell>
      {/* Status Bar */}
      <div className="glass-card rounded-lg p-3 mb-6 border-l-2 border-l-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm font-bold text-foreground">aeigsthub</span>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-[10px] font-mono text-green-500">AKTIF</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <s.icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground">{s.label}</span>
                <span className="text-xs font-mono font-bold text-foreground">{s.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-1 text-[10px] font-mono text-orange-400">
              <span>XMR</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-blue-400">LTC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          {/* Trends Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              {
                label: "LTC/USD",
                value: `$${marketStats.ltcUsd.toFixed(2)}`,
                trend: "+2.4%",
                up: true,
                icon: TrendingUp,
              },
              {
                label: "En Popüler",
                value: marketStats.topCategory,
                trend: "Yüksek",
                up: true,
                icon: Sparkles,
              },
              { label: "Güvenlik", value: "Maksimum", trend: "Stabil", up: true, icon: Shield },
            ].map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-secondary/30 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background border border-white/5 group-hover:border-primary/20 transition-all">
                    <t.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      {t.label}
                    </div>
                    <div className="text-sm font-mono font-bold text-foreground">{t.value}</div>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 text-[10px] font-mono font-bold ${t.up ? "text-green-500" : "text-destructive"}`}
                >
                  {t.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {t.trend}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h1 className="text-lg font-mono font-bold text-foreground">Aktif Listeler</h1>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
              {filtered.length} sonuç
            </span>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün ara..."
                className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-1 p-1 bg-secondary rounded-lg border border-border">
              {(["all", "digital", "physical"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-[10px] font-mono rounded-md transition-all ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "TÜMÜ" : f === "digital" ? "DİJİTAL" : "FİZİKSEL"}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all ${
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              Tüm Kategoriler
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all ${
                  categoryFilter === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                📂 {c}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="glass-card rounded-lg p-12 text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <div className="text-muted-foreground font-mono text-sm">Ürün bulunamadı.</div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, i) => {
              const totalPrice = p.price + p.price * SERVICE_FEE_RATE;
              const vendorName = vendorNames[p.vendor_id] || "Anonim";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="glass-card rounded-lg overflow-hidden cursor-pointer hover:neon-border transition-all group relative"
                >
                  <div className="aspect-[4/3] bg-secondary flex items-center justify-center overflow-hidden relative">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-5xl opacity-60">{p.image_emoji || "📦"}</span>
                    )}
                    {p.category && (
                      <span className="absolute top-2 left-2 text-[9px] font-mono px-1.5 py-0.5 bg-background/80 backdrop-blur text-primary rounded">
                        {p.category}
                      </span>
                    )}
                    <div className="absolute top-1 right-1" onClick={(e) => e.stopPropagation()}>
                      <WatchlistButton productId={p.id} size="sm" />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {p.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
                      {p.description}
                    </div>

                    {(p.origin || p.destination) && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] font-mono text-muted-foreground">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="truncate">
                          {p.origin || "?"} → {p.destination || "?"}
                        </span>
                      </div>
                    )}

                    {/* Vendor link */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vendor/${p.vendor_id}`);
                      }}
                      className="flex items-center gap-1 mt-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
                    >
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{vendorName}</span>
                      <VendorRating vendorId={p.vendor_id} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalProduct(p);
                      }}
                      className="flex items-center gap-1 mt-2 text-[10px] font-mono text-primary hover:underline"
                    >
                      <Eye className="w-3 h-3" /> Detaylar
                    </button>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-mono font-bold text-foreground">
                          {totalPrice.toFixed(4)} LTC
                        </span>
                        <span className="text-[10px] font-mono text-orange-400">
                          {(totalPrice * 0.62).toFixed(4)} XMR
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            p.type === "digital"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-orange-500/10 text-orange-400"
                          }`}
                        >
                          {p.type === "digital" ? (
                            <Key className="w-3 h-3" />
                          ) : (
                            <Package className="w-3 h-3" />
                          )}
                          {p.type === "digital" ? "DİJİTAL" : "FİZİKSEL"}
                        </span>
                        <span
                          className={`text-[9px] font-mono ${p.stock > 5 ? "text-green-500" : "text-yellow-500"}`}
                        >
                          {p.stock > 5 ? `${p.stock} stok` : `Son ${p.stock}!`}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Live Activity */}
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-xl border-l-2 border-primary">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">
                Canlı Aktivite
              </h3>
            </div>
            <div className="space-y-4">
              {liveActivity.length > 0 ? (
                liveActivity.map((act, i) => (
                  <div
                    key={i}
                    className="flex gap-3 text-[10px] font-mono border-b border-white/5 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="p-1.5 rounded bg-secondary/50 h-fit">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 mb-0.5">
                        <span className="text-primary font-bold">{act.user}</span>
                        <span className="text-muted-foreground shrink-0">{act.time}</span>
                      </div>
                      <div className="text-foreground/80">
                        <span className="text-muted-foreground">{act.action}:</span> {act.item}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[10px] font-mono text-muted-foreground text-center py-4">
                  Aktivite aranıyor...
                </div>
              )}
            </div>
            <button className="w-full mt-4 py-2 border border-white/5 rounded-lg text-[9px] font-mono text-muted-foreground hover:bg-secondary/30 transition-all uppercase tracking-widest">
              Tüm Aktiviteyi Gör
            </button>
          </div>

          <div className="glass-card p-5 rounded-xl">
            <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest mb-4">
              Pazar İstatistikleri
            </h3>
            <div className="space-y-3">
              {[
                { label: "Toplam Ürün", value: marketStats.totalProducts.toLocaleString() },
                { label: "Aktif Satıcı", value: marketStats.activeVendors.toLocaleString() },
                { label: "24s Hacim", value: `${marketStats.volume24h.toFixed(2)} LTC` },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-mono font-bold text-primary">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <QuickViewModal
        product={modalProduct}
        vendorName={modalProduct ? vendorNames[modalProduct.vendor_id] : undefined}
        open={!!modalProduct}
        onOpenChange={(v) => !v && setModalProduct(null)}
      />
    </PageShell>
  );
}
