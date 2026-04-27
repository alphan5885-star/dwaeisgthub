import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin } from "lucide-react";

interface Product {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  category?: string | null;
  origin?: string | null;
  destination?: string | null;
  image_emoji?: string | null;
}

export default function ProductDescriptionModal({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!product) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border neon-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary flex items-center gap-2">
            <span className="text-2xl">{product.image_emoji || "📦"}</span>
            {product.title}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {product.category || "Kategori yok"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {(product.origin || product.destination) && (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <MapPin className="w-3 h-3 text-primary" />
              <span>
                {product.origin || "?"} → {product.destination || "?"}
              </span>
            </div>
          )}
          <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {product.description || "Bu ürün için açıklama girilmemiş."}
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">Fiyat</span>
            <span className="text-primary font-mono font-bold">{product.price} LTC</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
