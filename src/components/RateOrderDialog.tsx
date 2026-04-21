import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Star, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  orderId: string;
  vendorId: string;
  productName: string;
  onClose: () => void;
  onRated: () => void;
}

export default function RateOrderDialog({ orderId, vendorId, productName, onClose, onRated }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("vendor_ratings").insert({
      buyer_id: user.id,
      vendor_id: vendorId,
      order_id: orderId,
      rating,
      review: comment.trim() || null,
    } as any);
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.error("Bu siparişi zaten puanladınız.");
      else toast.error("Puanlama kaydedilemedi.");
    } else {
      toast.success("Puan kaydedildi!");
      onRated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card neon-border rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-mono font-bold text-primary">Satıcıyı Puanla</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-4">{productName}</p>

        <div className="flex items-center gap-1 justify-center mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star className={`w-7 h-7 ${(hover || rating) >= s ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Yorum (opsiyonel)..."
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg p-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-4"
        />

        <button
          onClick={submit}
          disabled={rating === 0 || submitting}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-mono text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
        >
          {submitting ? "Kaydediliyor..." : "Puanla"}
        </button>
      </div>
    </div>
  );
}
