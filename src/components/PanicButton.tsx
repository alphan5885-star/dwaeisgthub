import { useState } from "react";
import { Flame, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useNavigate } from "@/lib/router-shim";

export default function PanicButton() {
  const [armed, setArmed] = useState(false);
  const [wiping, setWiping] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const execute = async () => {
    setWiping(true);
    try {
      const { data, error } = await supabase.rpc("panic_wipe_user" as any);
      if (error) throw error;
      const res = data as { success: boolean; rooms_destroyed?: number; orders_cancelled?: number; error?: string };
      if (!res?.success) throw new Error(res?.error || "Panic failed");

      toast.success(`🔥 İzler silindi. ${res.rooms_destroyed ?? 0} oda imha, ${res.orders_cancelled ?? 0} sipariş iptal. Çıkış yapılıyor…`);

      // Nuke client-side state
      try {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0].trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
      } catch {}

      await logout();
      navigate("/", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
      toast.error(`Panik modu başarısız: ${msg}`);
      setWiping(false);
      setArmed(false);
    }
  };

  return (
    <div className="glass-card rounded-lg p-4 border border-destructive/40 bg-destructive/5">
      <div className="flex items-start gap-3 mb-3">
        <Flame className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-mono font-bold text-destructive">PANİK MODU</div>
          <div className="text-[11px] text-muted-foreground font-mono leading-relaxed mt-1">
            Tüm sohbet geçmişlerin silinir, bekleyen siparişlerin iptal edilir, bakiyen dondurulur ve oturumun anında kapatılır. <span className="text-destructive">Geri alınamaz.</span>
          </div>
        </div>
      </div>

      {!armed ? (
        <button
          onClick={() => setArmed(true)}
          className="w-full px-3 py-2 bg-destructive/15 text-destructive text-xs font-mono rounded hover:bg-destructive/25 transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Panik Modunu Aktifleştir
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={execute}
            disabled={wiping}
            className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground text-xs font-mono font-bold rounded animate-pulse disabled:opacity-50"
          >
            {wiping ? "İMHA EDİLİYOR…" : "🔥 EVET, HER ŞEYİ SİL"}
          </button>
          <button
            onClick={() => setArmed(false)}
            disabled={wiping}
            className="px-3 py-2 bg-secondary text-muted-foreground text-xs font-mono rounded"
          >
            İptal
          </button>
        </div>
      )}
    </div>
  );
}
