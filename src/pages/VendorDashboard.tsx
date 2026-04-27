import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import {
  Plus,
  Package,
  Key,
  Upload,
  Trash2,
  Loader2,
  ImageIcon,
  TrendingUp,
  ShoppingBag,
  Coins,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  stock: number;
  image_emoji: string | null;
  image_url: string | null;
  delivery_data: string | null;
  tracking_number: string | null;
  category: string | null;
  origin: string | null;
  destination: string | null;
}

const CATEGORIES = ["Dijital Veriler", "Lojistik Rotaları", "VIP Erişim"];

export default function VendorDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    activeProducts: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    type: "digital",
    deliveryData: "",
    category: CATEGORIES[0],
    origin: "",
    destination: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    if (!user) return;
    isMounted.current = true;
    const fetchData = async () => {
      try {
        const [prodRes, orderRes] = await Promise.all([
          supabase
            .from("products")
            .select("*")
            .eq("vendor_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("*")
            .eq("vendor_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (!isMounted.current) return;

        if (prodRes.error) toast.error("Ürünler yüklenirken hata oluştu");
        if (orderRes.error) toast.error("Siparişler yüklenirken hata oluştu");

        if (prodRes.data) setProducts(prodRes.data as any);
        if (orderRes.data) {
          const ords = orderRes.data;
          setOrders(ords);

          // Stats
          const totalRevenue = ords.reduce(
            (acc, o) => acc + (o.status === "completed" ? Number(o.amount) : 0),
            0,
          );
          setStats({
            totalSales: ords.length,
            activeProducts: prodRes.data?.length || 0,
            pendingOrders: ords.filter((o) => o.status === "processing" || o.status === "pending")
              .length,
            totalRevenue,
          });

          // Chart data (last 7 days)
          const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
          const chartMap = new Map();
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString("tr-TR", { weekday: "short" });
            chartMap.set(dateStr, 0);
          }

          ords.forEach((o) => {
            const dateStr = new Date(o.created_at).toLocaleDateString("tr-TR", {
              weekday: "short",
            });
            if (chartMap.has(dateStr)) {
              chartMap.set(dateStr, chartMap.get(dateStr) + Number(o.amount));
            }
          });

          const data = Array.from(chartMap).map(([name, value]) => ({ name, value }));
          setSalesData(data);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch error in VendorDashboard fetch:", e);
      }
    };
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Desteklenen formatlar: JPG, PNG, GIF, WebP");
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maksimum dosya boyutu: 5MB");
      return;
    }
    // Sanitize extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      toast.error("Geçersiz dosya uzantısı");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user || !form.name || !form.price) return;
    setSaving(true);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
        const ext = imageFile.name.split(".").pop()?.toLowerCase();
        if (!ext || !allowedExts.includes(ext)) {
          toast.error("Geçersiz dosya uzantısı");
          if (isMounted.current) setSaving(false);
          return;
        }
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, imageFile);

        if (upErr) {
          if (import.meta.env.DEV) console.error("Error uploading product image:", upErr);
          toast.error("Resim yüklenemedi");
          if (isMounted.current) setSaving(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("product-images").getPublicUrl(path);
        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from("products")
        .insert({
          title: form.name,
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          stock: parseInt(form.stock) || 0,
          type: form.type,
          category: form.category,
          origin: form.origin || null,
          destination: form.destination || null,
          vendor_id: user.id,
          delivery_data: form.type === "digital" ? form.deliveryData : null,
          tracking_number: form.type === "physical" ? form.deliveryData : null,
          image_emoji: imageUrl ? null : form.type === "digital" ? "🔐" : "📦",
          image_url: imageUrl,
        } as any)
        .select()
        .maybeSingle();

      if (!isMounted.current) return;

      if (error) {
        if (import.meta.env.DEV) console.error("Error inserting product:", error);
        toast.error(error.message);
        setSaving(false);
        return;
      }

      if (data) {
        setProducts((prev) => [data as ProductRow, ...prev]);
        setForm({
          name: "",
          description: "",
          price: "",
          stock: "",
          type: "digital",
          deliveryData: "",
          category: CATEGORIES[0],
          origin: "",
          destination: "",
        });
        setImageFile(null);
        setImagePreview(null);
        setShowAdd(false);
        toast.success("Ürün eklendi!");
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error("Catch error in VendorDashboard handleSave:", e);
      if (isMounted.current) toast.error("Beklenmedik bir hata oluştu");
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (!isMounted.current) return;
      if (error) {
        if (import.meta.env.DEV) console.error("Error deleting product:", error);
        toast.error(error.message);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Ürün silindi");
    } catch (e) {
      if (import.meta.env.DEV) console.error("Catch error in VendorDashboard handleDelete:", e);
      if (isMounted.current) toast.error("Silme işlemi sırasında hata oluştu");
    }
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Satıcı Paneli</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-mono rounded neon-glow-btn"
        >
          <Plus className="w-3 h-3" /> Yeni Ürün
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Toplam Satış",
            value: stats.totalSales,
            icon: ShoppingBag,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
          },
          {
            label: "Aktif Ürünler",
            value: stats.activeProducts,
            icon: Package,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
          },
          {
            label: "Bekleyen Sipariş",
            value: stats.pendingOrders,
            icon: Loader2,
            color: "text-orange-400",
            bg: "bg-orange-400/10",
          },
          {
            label: "Toplam Gelir",
            value: `${stats.totalRevenue.toFixed(3)} LTC`,
            icon: Coins,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4 rounded-xl border border-white/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-50" />
            </div>
            <div className="text-2xl font-mono font-bold text-foreground">{stat.value}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sales Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 rounded-xl border border-white/5 mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-foreground">Satış Analitiği</h2>
              <p className="text-[10px] text-muted-foreground font-mono">Son 7 günlük performans</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded text-[10px] font-mono text-muted-foreground border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Canlı Veri
          </div>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#888", fontFamily: "monospace" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#888", fontFamily: "monospace" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(13, 13, 13, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
                itemStyle={{ color: "hsl(var(--primary))" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest">
          Ürünlerim
        </h2>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card rounded-lg p-5 mb-4 neon-border overflow-hidden"
        >
          {/* Image Upload */}
          <div className="mb-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 bg-secondary border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-mono text-muted-foreground">
                    Ürün fotoğrafı yükle
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ürün adı"
              className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="digital">Dijital</option>
              <option value="physical">Fiziksel</option>
            </select>
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Fiyat (LTC)"
              type="number"
              step="0.01"
              className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="Stok"
              type="number"
              className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="col-span-2 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  📂 {c}
                </option>
              ))}
            </select>
            <input
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              placeholder="📍 Origin (Çıkış)"
              className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="🎯 Destination (Varış)"
              className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Açıklama"
              className="col-span-2 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
            />
            <input
              value={form.deliveryData}
              onChange={(e) => setForm({ ...form, deliveryData: e.target.value })}
              placeholder={
                form.type === "digital" ? "Teslimat verisi (key/link)" : "Kargo takip no"
              }
              className="col-span-2 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-mono rounded neon-glow-btn flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Ürünü Kaydet
          </button>
        </motion.div>
      )}

      {products.length === 0 && !showAdd && (
        <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">
          Henüz ürün eklenmedi.
        </div>
      )}

      <div className="space-y-3">
        {products.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded object-cover" />
              ) : (
                <span className="text-2xl">{p.image_emoji || "📦"}</span>
              )}
              <div>
                <div className="text-sm font-medium text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                {p.category && (
                  <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                    📂 {p.category}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-mono font-bold text-primary">{p.price} LTC</div>
                <div className="text-[10px] text-muted-foreground font-mono">Stok: {p.stock}</div>
              </div>
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${
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
              <button
                onClick={() => handleDelete(p.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
