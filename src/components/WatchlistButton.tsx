import { useEffect, useState, useRef } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";

export default function WatchlistButton({
  productId,
  size = "md",
}: {
  productId: string;
  size?: "sm" | "md";
}) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!user) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("watchlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", productId)
          .maybeSingle();

        if (!isMounted.current) return;

        if (error) {
          console.error("Error checking watchlist status:", error);
          return;
        }

        setActive(!!data);
      } catch (e) {
        console.error("Catch error in WatchlistButton checkStatus:", e);
      }
    };

    checkStatus();
    return () => {
      isMounted.current = false;
    };
  }, [user, productId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast.error("Giriş yap");
      return;
    }

    setLoading(true);
    try {
      if (active) {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        if (!isMounted.current) return;

        if (error) {
          console.error("Error removing from watchlist:", error);
          toast.error("Hata oluştu");
          setLoading(false);
          return;
        }

        setActive(false);
        toast.success("Favorilerden çıkarıldı");
      } else {
        const { error } = await supabase
          .from("watchlist")
          .insert({ user_id: user.id, product_id: productId });

        if (!isMounted.current) return;

        if (error) {
          console.error("Error adding to watchlist:", error);
          toast.error("Hata oluştu");
          setLoading(false);
          return;
        }

        setActive(true);
        toast.success("Favorilere eklendi");
      }
      window.dispatchEvent(new CustomEvent("watchlist:changed"));
    } catch (e) {
      console.error("Catch error in WatchlistButton toggle:", e);
      if (isMounted.current) toast.error("Beklenmedik bir hata oluştu");
    } finally {
      if (isMounted.current) setLoading(false);
    }
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
