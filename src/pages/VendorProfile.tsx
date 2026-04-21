import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "@/lib/router-shim";
import { Star, User, Package, Shield, Clock, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import VendorRating from "@/components/VendorRating";

interface VendorProfileData {
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  buyer_display_name: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  image_emoji: string | null;
  image_url: string | null;
  stock: number;
  category: string | null;
}

export default function VendorProfile() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [profile, setProfile] = useState<VendorProfileData | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, completedOrders: 0, memberSince: "" });
  const [tab, setTab] = useState<"reviews" | "products">("reviews");

  useEffect(() => {
    if (!vendorId) return;
    const load = async () => {
      // Profile
      const { data: p } = await (supabase as any)
        .from("profiles")
        .select("display_name, avatar_url, banner_url, bio")
        .eq("user_id", vendorId)
        .single();
      if (p) setProfile(p as VendorProfileData);

      // Reviews with buyer names
      const { data: r } = await supabase
        .from("vendor_ratings")
        .select("id, rating, comment, created_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (r) {
        // Get buyer display names
        const buyerIds = [...new Set(r.map(() => ""))]; // placeholder
        setReviews(r.map((rev: any) => ({
          ...rev,
          buyer_display_name: "Anonim Alıcı",
        })));
      }

      // Products
      const { data: prod } = await supabase
        .from("products")
        .select("id, name, price, image_emoji, image_url, stock, category")
        .eq("vendor_id", vendorId)
        .gt("stock", 0);
      if (prod) setProducts(prod as any);

      // Stats
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, created_at, products:product_id(vendor_id)")
        .order("created_at", { ascending: true });
      
      const vendorOrders = (orders || []).filter((o: any) => o.products?.vendor_id === vendorId);
      const { data: roleData } = await (supabase as any)
        .from("user_roles")
        .select("created_at")
        .eq("user_id", vendorId)
        .single();

      setStats({
        totalOrders: vendorOrders.length,
        completedOrders: vendorOrders.filter((o: any) => o.status === "completed").length,
        memberSince: roleData?.created_at
          ? new Date(roleData.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })
          : "",
      });
    };
    load();
  }, [vendorId]);

  if (!profile || !vendorId) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-sm">
          Yükleniyor...
        </div>
      </PageShell>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Banner */}
        <div className="relative rounded-lg overflow-hidden h-40 bg-secondary">
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 via-card to-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
        </div>

        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-lg p-6 -mt-16 relative z-10 neon-border">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-secondary border-2 border-primary/30 overflow-hidden flex items-center justify-center -mt-12 ring-4 ring-card">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-mono font-bold text-foreground">
                {profile.display_name || "Anonim Satıcı"}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <VendorRating vendorId={vendorId} size="md" />
                <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-primary/10 text-primary">
                  SATICI
                </span>
              </div>
              {profile.bio && (
                <p className="text-xs text-muted-foreground font-mono mt-2">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center p-3 bg-secondary rounded-lg">
              <Package className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="text-lg font-mono font-bold text-foreground">{stats.totalOrders}</div>
              <div className="text-[10px] font-mono text-muted-foreground">Toplam Sipariş</div>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <Shield className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <div className="text-lg font-mono font-bold text-foreground">{stats.completedOrders}</div>
              <div className="text-[10px] font-mono text-muted-foreground">Tamamlanan</div>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <div className="text-sm font-mono font-bold text-foreground">{stats.memberSince || "—"}</div>
              <div className="text-[10px] font-mono text-muted-foreground">Üyelik</div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("reviews")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              tab === "reviews" ? "bg-primary text-primary-foreground neon-glow-btn" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="w-3.5 h-3.5" /> Yorumlar ({reviews.length})
          </button>
          <button
            onClick={() => setTab("products")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              tab === "products" ? "bg-primary text-primary-foreground neon-glow-btn" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Ürünler ({products.length})
          </button>
        </div>

        {/* Reviews Tab */}
        {tab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="glass-card rounded-lg p-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-mono text-muted-foreground">Henüz yorum yok.</p>
              </div>
            ) : (
              <>
                {/* Rating Summary */}
                <div className="glass-card rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-mono font-bold text-primary">{avgRating}</div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= Math.round(Number(avgRating)) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-1">{reviews.length} yorum</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter((r) => r.rating === star).length;
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground w-3">{star}</span>
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Individual Reviews */}
                {reviews.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-mono text-primary">
                          A
                        </div>
                        <span className="text-xs font-mono text-foreground">{r.buyer_display_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground font-mono">{r.comment}</p>
                    )}
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Products Tab */}
        {tab === "products" && (
          <div className="grid grid-cols-2 gap-3">
            {products.length === 0 ? (
              <div className="col-span-2 glass-card rounded-lg p-8 text-center">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-mono text-muted-foreground">Ürün bulunamadı.</p>
              </div>
            ) : (
              products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-lg p-4 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => window.location.href = `/product/${p.id}`}
                >
                  <div className="text-2xl mb-2">{p.image_emoji || "📦"}</div>
                  <div className="text-sm font-mono font-medium text-foreground">{p.name}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-mono font-bold text-primary">{p.price} LTC</span>
                    <span className="text-[10px] font-mono text-muted-foreground">Stok: {p.stock}</span>
                  </div>
                  {p.category && (
                    <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded mt-2 inline-block">
                      {p.category}
                    </span>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
