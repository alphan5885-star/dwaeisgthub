import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, Key, Package, ShieldCheck, ShoppingCart, User, ExternalLink } from "lucide-react";
import { useNavigate } from "@/lib/router-shim";
import VendorRating from "./VendorRating";
import { useCustomization } from "@/lib/customizationContext";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  type: string;
  category?: string | null;
  origin?: string | null;
  destination?: string | null;
  image_emoji?: string | null;
  image_url?: string | null;
  stock: number;
  vendor_id: string;
}

export default function QuickViewModal({
  product,
  open,
  onOpenChange,
  vendorName,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendorName?: string;
}) {
  const navigate = useNavigate();
  const { settings } = useCustomization();
  if (!product) return null;

  const commission = product.price * 0.05;
  const priceLTC = product.price + commission;
  const priceXMR = priceLTC * 0.62;
  const priceUSD = priceLTC * 84.22;

  const displayPrice =
    settings.preferredCurrency === "XMR"
      ? priceXMR.toFixed(4)
      : settings.preferredCurrency === "USD"
        ? priceUSD.toFixed(2)
        : priceLTC.toFixed(4);

  const currencyLabel = settings.preferredCurrency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border neon-border max-w-lg p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left: Image/Emoji Section */}
          <div className="w-full md:w-2/5 bg-secondary flex items-center justify-center relative min-h-[200px]">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-7xl">{product.image_emoji || "📦"}</span>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <span
                className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-background/80 backdrop-blur-md border border-white/5 ${
                  product.type === "digital" ? "text-blue-400" : "text-orange-400"
                }`}
              >
                {product.type === "digital" ? (
                  <Key className="w-3 h-3" />
                ) : (
                  <Package className="w-3 h-3" />
                )}
                {product.type === "digital" ? "DİJİTAL" : "FİZİKSEL"}
              </span>
            </div>
          </div>

          {/* Right: Info Section */}
          <div className="flex-1 p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
                  {product.category || "Genel"}
                </span>
                <span
                  className={`text-[10px] font-mono ${product.stock > 0 ? "text-green-500" : "text-destructive"}`}
                >
                  {product.stock > 0 ? `STOK: ${product.stock}` : "STOKTA YOK"}
                </span>
              </div>
              <DialogTitle className="font-mono text-xl text-foreground mb-2">
                {product.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary text-[10px] font-mono text-muted-foreground border border-white/5">
                  <User className="w-3 h-3" />
                  {vendorName || "Anonim"}
                </div>
                <VendorRating vendorId={product.vendor_id} showBadges={true} />
              </div>
            </DialogHeader>

            <div className="flex-1 space-y-4">
              <div className="text-sm text-muted-foreground font-mono leading-relaxed max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {product.description || "Bu ürün için detaylı açıklama bulunmamaktadır."}
              </div>

              {(product.origin || product.destination) && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-secondary/50 p-2 rounded border border-white/5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{product.origin || "?"}</span>
                  <span className="text-primary/50">→</span>
                  <span>{product.destination || "?"}</span>
                </div>
              )}

              <div className="flex items-end justify-between py-4 border-t border-border mt-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Toplam Fiyat ({currencyLabel})
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-primary">
                      {displayPrice}
                    </span>
                    <span className="text-xs font-mono text-primary/70">{currencyLabel}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground italic">
                    {settings.preferredCurrency !== "LTC" && `≈ ${priceLTC.toFixed(4)} LTC`}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-[10px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    <span>Güvenli Escrow</span>
                  </div>
                  <span>%5 Hizmet Bedeli Dahil</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => navigate(`/product/${product.id}`)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-mono text-xs font-bold hover:neon-glow-btn transition-all group"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                SATIN AL
              </button>
              <button
                onClick={() => navigate(`/product/${product.id}`)}
                className="px-3 py-2.5 bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border"
                title="Ürün Sayfasına Git"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
