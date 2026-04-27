import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-shim";
import {
  Package,
  Key,
  Search,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import VendorRating from "@/components/VendorRating";

type Tab = "products" | "orders" | "vendors";

interface ProductRow {
  id: string;
  name: string | null;
  title: string;
  description: string | null;
  price: number;
  type: string | null;
  stock: number | null;
  image_emoji: string | null;
  image_url: string | null;
  is_active: boolean | null;
  vendor_id: string;
  category: string | null;
  commission_rate: number | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  amount: number;
  status: string | null;
  delivery_method: string | null;
  created_at: string;
  buyer_id: string;
  vendor_id: string;
  product_name: string | null;
  notes: string | null;
}

interface VendorInfo {
  user_id: string;
  display_name: string | null;
  product_count: number;
  order_count: number;
  total_revenue: number;
}

export default function AdminStore() {
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProductRow>>({});
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    isMounted.current = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [prodRes, ordRes, vendorRolesRes, profilesRes] = await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("orders").select("*").order("created_at", { ascending: false }),
          supabase.from("user_roles").select("user_id").eq("role", "vendor"),
          supabase.from("profiles").select("user_id, display_name"),
        ]);

        if (!isMounted.current) return;

        if (prodRes.data) setProducts(prodRes.data as any);
        if (ordRes.data) setOrders(ordRes.data as any);

        // Build vendor info
        if (vendorRolesRes.data && prodRes.data && ordRes.data && profilesRes.data) {
          const profileMap = new Map(profilesRes.data.map((p: any) => [p.user_id, p.display_name]));
          const vendorInfos: VendorInfo[] = vendorRolesRes.data.map((v: any) => {
            const prods = (prodRes.data as any[]).filter((p) => p.vendor_id === v.user_id);
            const ords = (ordRes.data as any[]).filter((o) => o.vendor_id === v.user_id);
            return {
              user_id: v.user_id,
              display_name: profileMap.get(v.user_id) || v.user_id.slice(0, 8),
              product_count: prods.length,
              order_count: ords.length,
              total_revenue: ords.reduce((s: number, o: any) => s + Number(o.amount), 0),
            };
          });
          setVendors(vendorInfos);
        }

        setLoading(false);
      } catch (e) {
        if (isMounted.current) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Product actions
  const toggleProductActive = async (id: string, current: boolean | null) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !current } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)));
    toast.success(!current ? "Ürün aktifleştirildi" : "Ürün devre dışı bırakıldı");
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Ürün silindi");
  };

  const startEdit = (p: ProductRow) => {
    setEditingProduct(p.id);
    setEditForm({
      name: p.name,
      price: p.price,
      stock: p.stock,
      description: p.description,
      commission_rate: p.commission_rate,
    });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("products")
      .update({
        name: editForm.name,
        title: editForm.name,
        price: editForm.price,
        stock: editForm.stock,
        description: editForm.description,
        commission_rate: editForm.commission_rate,
      } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...editForm, title: editForm.name || p.title } : p)),
    );
    setEditingProduct(null);
    toast.success("Ürün güncellendi");
  };

  // Order actions
  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(`Sipariş durumu: ${status}`);
  };

  // Filtered data
  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    return (p.name || p.title || "").toLowerCase().includes(search.toLowerCase());
  });

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (
      search &&
      !(o.product_name || "").toLowerCase().includes(search.toLowerCase()) &&
      !o.id.includes(search)
    )
      return false;
    return true;
  });

  const statusColor = (s: string | null) => {
    if (s === "completed") return "text-green-500";
    if (s === "processing") return "text-yellow-500";
    if (s === "cancelled") return "text-destructive";
    return "text-muted-foreground";
  };

  const statusIcon = (s: string | null) => {
    if (s === "completed") return <CheckCircle className="w-3 h-3" />;
    if (s === "processing") return <Clock className="w-3 h-3" />;
    if (s === "cancelled") return <XCircle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "products", label: "Ürünler", icon: Package, count: products.length },
    { key: "orders", label: "Siparişler", icon: ShoppingCart, count: orders.length },
    { key: "vendors", label: "Satıcılar", icon: Users, count: vendors.length },
  ];

  if (loading) {
    return (
      <PageShell>
        <div className="text-muted-foreground font-mono animate-pulse text-center py-12">
          Yükleniyor...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Mağaza Yönetimi</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground">
            {products.length} ürün • {orders.length} sipariş • {vendors.length} satıcı
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg border border-border mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSearch("");
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono rounded-md transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span
              className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${
                tab === t.key ? "bg-primary-foreground/20" : "bg-border"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "products"
                ? "Ürün ara..."
                : tab === "orders"
                  ? "Sipariş ara..."
                  : "Satıcı ara..."
            }
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {tab === "orders" && (
          <div className="flex gap-1 p-1 bg-secondary rounded-lg border border-border">
            {["all", "pending", "processing", "completed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all ${
                  orderFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all"
                  ? "TÜMÜ"
                  : f === "pending"
                    ? "BEKLEYEN"
                    : f === "processing"
                      ? "İŞLENEN"
                      : f === "completed"
                        ? "TAMAMLANAN"
                        : "İPTAL"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Tab */}
      {tab === "products" && (
        <div className="space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">
              Ürün bulunamadı.
            </div>
          ) : (
            filteredProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`glass-card rounded-lg p-4 ${p.is_active === false ? "opacity-50" : ""}`}
              >
                {editingProduct === p.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Ürün adı"
                        className="col-span-2 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        value={editForm.price || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="Fiyat"
                        type="number"
                        step="0.01"
                        className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        value={editForm.stock ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })
                        }
                        placeholder="Stok"
                        type="number"
                        className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Açıklama"
                      rows={2}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-mono text-muted-foreground">Komisyon %:</label>
                      <input
                        value={editForm.commission_rate ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            commission_rate: parseFloat(e.target.value) || 0,
                          })
                        }
                        type="number"
                        step="0.5"
                        className="w-20 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-[10px] font-mono rounded hover:bg-green-700"
                      >
                        <Save className="w-3 h-3" /> Kaydet
                      </button>
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-muted-foreground text-[10px] font-mono rounded hover:bg-border"
                      >
                        <X className="w-3 h-3" /> İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name || p.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{p.image_emoji || "📦"}</span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {p.name || p.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {p.category || "Kategori yok"} • Komisyon: {p.commission_rate ?? 5}%
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {p.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-primary">
                          {p.price} LTC
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Stok: {p.stock ?? 0}
                        </div>
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
                      <VendorRating vendorId={p.vendor_id} />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleProductActive(p.id, p.is_active)}
                          className="p-1.5 text-muted-foreground hover:text-yellow-500 transition-colors"
                          title={p.is_active !== false ? "Devre dışı bırak" : "Aktifleştir"}
                        >
                          {p.is_active !== false ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="space-y-2">
          {filteredOrders.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">
              Sipariş bulunamadı.
            </div>
          ) : (
            filteredOrders.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card rounded-lg p-4"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {o.product_name || "Ürün"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        #{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleDateString("tr-TR")} •{" "}
                        {o.delivery_method || "dijital"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-primary">{o.amount} LTC</div>
                    </div>
                    <span
                      className={`flex items-center gap-1 ${statusColor(o.status)} text-[10px] font-mono`}
                    >
                      {statusIcon(o.status)} {o.status || "pending"}
                    </span>
                    {expandedOrder === o.id ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {expandedOrder === o.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border space-y-2 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <span className="text-muted-foreground">Alıcı:</span>{" "}
                          <span className="text-foreground">{o.buyer_id.slice(0, 12)}...</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Satıcı:</span>{" "}
                          <span className="text-foreground">{o.vendor_id.slice(0, 12)}...</span>
                        </div>
                        {o.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Not:</span>{" "}
                            <span className="text-foreground">{o.notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        {o.status !== "completed" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "completed")}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-500 text-[10px] font-mono rounded hover:bg-green-600/30"
                          >
                            <CheckCircle className="w-3 h-3" /> Tamamla
                          </button>
                        )}
                        {o.status !== "processing" && o.status !== "completed" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "processing")}
                            className="flex items-center gap-1 px-2 py-1 bg-yellow-600/20 text-yellow-500 text-[10px] font-mono rounded hover:bg-yellow-600/30"
                          >
                            <Clock className="w-3 h-3" /> İşleme Al
                          </button>
                        )}
                        {o.status !== "cancelled" && o.status !== "completed" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "cancelled")}
                            className="flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive text-[10px] font-mono rounded hover:bg-destructive/30"
                          >
                            <XCircle className="w-3 h-3" /> İptal Et
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Vendors Tab */}
      {tab === "vendors" && (
        <div className="space-y-2">
          {vendors.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">
              Kayıtlı satıcı yok.
            </div>
          ) : (
            vendors
              .filter(
                (v) =>
                  !search || (v.display_name || "").toLowerCase().includes(search.toLowerCase()),
              )
              .map((v, i) => (
                <motion.div
                  key={v.user_id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => navigate(`/vendor/${v.user_id}`)}
                  className="glass-card rounded-lg p-4 flex items-center justify-between cursor-pointer hover:neon-border transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-mono text-primary font-bold">
                      {(v.display_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {v.display_name || "Anonim"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {v.user_id.slice(0, 12)}...
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-foreground">
                        {v.product_count}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">Ürün</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-foreground">
                        {v.order_count}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">Sipariş</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-primary">
                        {v.total_revenue.toFixed(2)} LTC
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">Gelir</div>
                    </div>
                    <VendorRating vendorId={v.user_id} />
                  </div>
                </motion.div>
              ))
          )}
        </div>
      )}
    </PageShell>
  );
}
