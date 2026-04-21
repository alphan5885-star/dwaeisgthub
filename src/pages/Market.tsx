import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-shim";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { Key, Package, Search, User, MapPin, Eye } from "lucide-react";
import { motion } from "framer-motion";
import VendorRating from "@/components/VendorRating";
import ProductDescriptionModal from "@/components/ProductDescriptionModal";

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

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Market</h1>
        <span className="text-xs font-mono text-muted-foreground">{filtered.length} ürün</span>
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
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/product/${p.id}`)}
              className="glass-card rounded-lg overflow-hidden cursor-pointer hover:neon-border transition-all group"
            >
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
                  <div>
                    <span className="text-sm font-mono font-bold text-primary">{totalPrice.toFixed(4)} LTC</span>
                    <span className="text-[9px] font-mono text-yellow-500 ml-1">+%5</span>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-mono ${
                    p.type === "digital" ? "text-blue-400" : "text-orange-400"
                  }`}>
                    {p.type === "digital" ? <Key className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                    {p.type === "digital" ? "DİJİTAL" : "FİZİKSEL"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-2">
                  Stok: {p.stock}
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
