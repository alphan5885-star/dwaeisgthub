import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-shim";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { Key, Package, Search, User, MapPin, Eye, Shield, Activity, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import VendorRating from "@/components/VendorRating";
import ProductDescriptionModal from "@/components/ProductDescriptionModal";
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
}

export default function Market() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "digital" | "physical">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modalProduct, setModalProduct] = useState<ProductRow | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, price, type, image_emoji, image_url, stock, vendor_id, category, origin, destination")
        .gt("stock", 0)
        .order("created_at", { ascending: false });
      if (data) {
        setProducts(data as ProductRow[]);
        // Fetch vendor display names
        const vendorIds = Array.from(new Set(data.map((p: any) => p.vendor_id)));
        if (vendorIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", vendorIds);
          if (profiles) {
            const map: Record<string, string> = {};
            profiles.forEach((p: any) => { map[p.user_id] = p.display_name || "Anonim"; });
            setVendorNames(map);
          }
        }
      }
    };
    fetch();
  }, []);

  const categories = FIXED_CATEGORIES;

  const filtered = products.filter((p) => {
    if (filter !== "all" && p.type !== filter) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { icon: Package, label: "Ürün", value: products.length },
    { icon: Users, label: "Online", value: Math.floor(12 + Math.random() * 8) },
    { icon: TrendingUp, label: "24h İşlem", value: Math.floor(45 + Math.random() * 20) },
  ];

  return (
    <PageShell>
      {/* Live Stats Banner */}
      <div className="glass-card neon-border rounded-lg p-3 mb-6 scan-line">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm font-bold text-primary neon-text glitch-text">aeigsthub</span>
            <span className="w-2 h-2 bg-green-500 rounded-full pulse-dot" />
            <span className="text-[10px] font-mono text-green-500">ONLINE</span>
          </div>
          <div className="flex items-center gap-4">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">{s.label}:</span>
                <span className="text-xs font-mono font-bold text-primary">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h1 className="text-lg font-mono font-bold text-foreground">Aktif Listeler</h1>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">{filtered.length} sonuç</span>
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
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
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
            categoryFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          Tüm Kategoriler
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all ${
              categoryFilter === c ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
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
              {/* Verified badge for digital products */}
              {p.type === "digital" && (
                <div className="absolute top-2 right-10 z-10">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded px-1.5 py-0.5 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-blue-400" />
                    <span className="text-[8px] font-mono text-blue-400">VERIFIED</span>
                  </div>
                </div>
              )}
              <div className="aspect-[4/3] bg-secondary flex items-center justify-center overflow-hidden relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">{p.description}</div>

                {(p.origin || p.destination) && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-mono text-muted-foreground">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="truncate">{p.origin || "?"} → {p.destination || "?"}</span>
                  </div>
                )}

                {/* Vendor link */}
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/vendor/${p.vendor_id}`); }}
                  className="flex items-center gap-1 mt-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
                >
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{vendorName}</span>
                  <VendorRating vendorId={p.vendor_id} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setModalProduct(p); }}
                  className="flex items-center gap-1 mt-2 text-[10px] font-mono text-primary hover:underline"
                >
                  <Eye className="w-3 h-3" /> Detaylar
                </button>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-mono font-bold text-primary neon-text">{totalPrice.toFixed(4)} LTC</span>
                    <span className="text-[9px] font-mono text-muted-foreground">+%5 escrow</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      p.type === "digital" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"
                    }`}>
                      {p.type === "digital" ? <Key className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      {p.type === "digital" ? "DİJİTAL" : "FİZİKSEL"}
                    </span>
                    <span className={`text-[9px] font-mono ${p.stock > 5 ? "text-green-500" : "text-yellow-500"}`}>
                      {p.stock > 5 ? `${p.stock} stok` : `Son ${p.stock}!`}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <ProductDescriptionModal
        product={modalProduct ? {
          id: modalProduct.id,
          title: modalProduct.name,
          description: modalProduct.description,
          price: modalProduct.price,
          category: modalProduct.category,
          origin: modalProduct.origin,
          destination: modalProduct.destination,
          image_emoji: modalProduct.image_emoji,
        } : null}
        open={!!modalProduct}
        onOpenChange={(v) => !v && setModalProduct(null)}
      />
    </PageShell>
  );
}
