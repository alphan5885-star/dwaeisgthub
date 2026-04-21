import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";

export default function WatchlistButton({ productId, size = "md" }: { productId: string; size?: "sm" | "md" }) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      setActive(!!data);
    })();
  }, [user, productId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) { toast.error("Giriş yap"); return; }
    setLoading(true);
    if (active) {
      await (supabase as any).from("watchlist").delete().eq("user_id", user.id).eq("product_id", productId);
      setActive(false);
      toast.success("Favorilerden çıkarıldı");
    } else {
      await (supabase as any).from("watchlist").insert({ user_id: user.id, product_id: productId });
      setActive(true);
      toast.success("Favorilere eklendi");
    }
    window.dispatchEvent(new CustomEvent("watchlist:changed"));
    setLoading(false);
  };

  const dim = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={`p-2 rounded-full transition-all ${active ? "bg-destructive/20 text-destructive" : "bg-secondary/40 text-muted-foreground hover:text-destructive"}`}
    >
      <Heart className={`${dim} ${active ? "fill-current" : ""}`} />
    </button>
  );
}
