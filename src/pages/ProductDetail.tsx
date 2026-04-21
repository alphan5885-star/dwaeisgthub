import { useState, useEffect } from "react";
import { useParams } from "@/lib/router-shim";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { ShoppingCart, Key, Package, User, Shield, Hash, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import VendorRating from "@/components/VendorRating";
import PgpBadge from "@/components/PgpBadge";
import DeliveryMethodSelector from "@/components/DeliveryMethodSelector";
import MathCaptcha from "@/components/MathCaptcha";
import PaymentTracker from "@/components/PaymentTracker";
import { encryptForRecipient } from "@/lib/pgp";

const SERVICE_FEE_RATE = 0.05;
type DeliveryMethod = "cargo" | "dead_drop" | "mailbox";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  vendor_id: string;
  stock: number;
  image_emoji: string | null;
  image_url: string | null;
  tracking_number: string | null;
  commission_rate: number | null;
  category: string | null;
}

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [vendorName, setVendorName] = useState<string>("");
  const [vendorPgp, setVendorPgp] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("cargo");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [captchaOk, setCaptchaOk] = useState(false);
  const [creating, setCreating] = useState(false);

  const serviceFee = product ? product.price * SERVICE_FEE_RATE : 0;
  const totalPrice = product ? product.price + serviceFee : 0;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const { data } = await supabase.from("products").select("id, name, description, price, type, vendor_id, stock, image_emoji, image_url, tracking_number, commission_rate, category").eq("id", id).single();
      if (data) {
        setProduct(data as ProductRow);
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", data.vendor_id).single();
        if (profile) setVendorName(profile.display_name || "Anonim Satıcı");
        const { data: pgp } = await (supabase as any).from("user_pgp_keys").select("public_key").eq("user_id", data.vendor_id).maybeSingle();
        if (pgp?.public_key) setVendorPgp(pgp.public_key);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const startPayment = async () => {
    if (!product || !user) return;
    if (!captchaOk) { toast.error("Önce bot doğrulamasını tamamla"); return; }
    if (product.type === "physical" && !shippingAddress.trim()) {
      toast.error("Teslimat bilgisi gerekli");
      return;
    }
    setCreating(true);

    // Auto-encrypt sensitive data with vendor's PGP key
    let finalAddress: string | null = shippingAddress.trim() || null;
    let finalNotes: string | null = orderNotes.trim() || null;
    let encrypted = false;
    if (vendorPgp && (finalAddress || finalNotes)) {
      try {
        const blob = `[ADDRESS]\n${finalAddress || "—"}\n\n[NOTES]\n${finalNotes || "—"}`;
        const cipher = await encryptForRecipient(blob, vendorPgp);
        finalAddress = cipher;
        finalNotes = "🔐 PGP encrypted (see shipping_address)";
        encrypted = true;
      } catch (e) {
        toast.error("PGP şifreleme başarısız, sipariş iptal");
        setCreating(false);
        return;
      }
    }

    const { data: order, error } = await supabase.from("orders").insert({
      product_id: product.id,
      buyer_id: user.id,
      vendor_id: product.vendor_id,
      status: "pending",
      amount: totalPrice,
      service_fee: serviceFee,
      delivery_method: product.type === "digital" ? "cargo" : deliveryMethod,
      shipping_address: finalAddress,
      notes: finalNotes,
    } as any).select().single();
    if (error || !order) { toast.error("Sipariş oluşturulamadı"); setCreating(false); return; }
    if (encrypted) toast.success("🔐 Adres satıcının PGP anahtarıyla şifrelendi");
    setOrderId(order.id);
    setCreating(false);
  };

  if (loading) return <PageShell><div className="text-muted-foreground font-mono animate-pulse">Yükleniyor...</div></PageShell>;
  if (!product) return <PageShell><div className="text-muted-foreground font-mono">Ürün bulunamadı.</div></PageShell>;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-lg overflow-hidden mb-4">
          {product.image_url ? (
            <div className="aspect-video bg-secondary"><img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /></div>
          ) : (
            <div className="aspect-video bg-secondary flex items-center justify-center"><span className="text-7xl opacity-40">{product.image_emoji || "📦"}</span></div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-bold text-foreground">{product.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-muted-foreground line-through">{product.price} LTC</div>
                <div className="text-2xl font-mono font-bold text-primary neon-text">{totalPrice.toFixed(4)} LTC</div>
                <div className="text-[10px] font-mono text-yellow-500 mt-0.5">+%{(SERVICE_FEE_RATE * 100).toFixed(0)} Hizmet ({serviceFee.toFixed(4)} LTC)</div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono mt-1 ${product.type === "digital" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"}`}>
                  {product.type === "digital" ? <Key className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                  {product.type.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <button onClick={() => window.location.assign(`/vendor/${product.vendor_id}`)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary font-mono transition-colors">
                <User className="w-3 h-3" /> {vendorName}
              </button>
              <VendorRating vendorId={product.vendor_id} size="md" />
              <div className="text-xs text-muted-foreground font-mono">Stok: {product.stock}</div>
              {product.category && <div className="text-[10px] font-mono px-2 py-0.5 bg-secondary rounded text-muted-foreground">{product.category}</div>}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-lg p-3 mb-4 flex items-center gap-3 border border-primary/20">
          <Shield className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <div className="text-[11px] font-mono font-bold text-primary">BlockCypher Canlı Doğrulama</div>
            <div className="text-[9px] font-mono text-muted-foreground">Geçici LTC adresi • 3 onay sonrası otomatik Operasyon DM • Komisyon dağıtımı</div>
          </div>
        </div>

        {!orderId && (
          <>
            {product.type === "physical" && user?.id !== product.vendor_id && (
              <div className="glass-card rounded-lg p-4 mb-4">
                <DeliveryMethodSelector value={deliveryMethod} onChange={setDeliveryMethod} productType={product.type} />
              </div>
            )}

            {user?.id === product.vendor_id ? (
              <div className="glass-card rounded-lg p-4 text-center text-xs font-mono text-muted-foreground border border-yellow-500/30">
                ⚠️ Bu sizin kendi ürününüz — satın alamazsınız.
              </div>
            ) : (
              <>
                <div className="glass-card rounded-lg p-4 mb-3">
                  <MathCaptcha onValidChange={setCaptchaOk} label="Satın al güvenlik doğrulaması" />
                </div>
                <motion.button
                  onClick={startPayment}
                  whileTap={{ scale: 0.98 }}
                  disabled={!captchaOk || creating}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-lg font-mono font-bold neon-glow-btn text-sm disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4" /> {creating ? "Hazırlanıyor..." : `SATIN AL — ${totalPrice.toFixed(4)} LTC`}
                </motion.button>
              </>
            )}
          </>
        )}

        {orderId && (
          <div>
            <div className="flex items-center gap-2 mb-3 p-2 bg-secondary rounded">
              <Hash className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">Sipariş:</span>
              <span className="text-xs font-mono text-foreground font-bold">{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <PaymentTracker orderId={orderId} amount={totalPrice} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
