import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { Camera, Save, User, Package, CheckCircle, Clock, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PanicButton from "@/components/PanicButton";
import PgpVault from "@/components/PgpVault";
import PgpBadge from "@/components/PgpBadge";
import CipherNotes from "@/components/CipherNotes";
import { devError } from "@/lib/utils";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
}

interface OrderRow {
  id: string;
  amount: number;
  status: string;
  delivery_confirmed: boolean;
  created_at: string;
  products: { name: string; image_url: string | null; image_emoji: string | null } | null;
}

export default function Profile() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    avatar_url: null,
    banner_url: null,
    bio: "",
  });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!user) return;

    const load = async () => {
      try {
        const { data: p, error: profileError } = await (supabase as any)
          .from("profiles")
          .select("display_name, avatar_url, banner_url, bio")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!isMounted.current) return;

        if (profileError) {
          devError("Error fetching profile:", profileError);
        } else if (p) {
          setProfile(p);
        }

        if (role === "buyer") {
          const { data: o, error: ordersError } = await supabase
            .from("orders")
            .select(
              "id, amount, status, delivery_confirmed, created_at, products:product_id(name, image_url, image_emoji)",
            )
            .eq("buyer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (!isMounted.current) return;

          if (ordersError) {
            devError("Error fetching profile orders:", ordersError);
          } else if (o) {
            setOrders(o as any);
          }
        }
      } catch (e) {
        devError("Catch error in Profile load:", e);
      }
    };

    load();
    return () => {
      isMounted.current = false;
    };
  }, [user, role]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Accept images and GIFs
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Desteklenen formatlar: JPG, PNG, GIF, WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maksimum dosya boyutu: 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (!isMounted.current) return;

      if (upErr) {
        devError("Error uploading avatar:", upErr);
        toast.error("Yükleme hatası");
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (!isMounted.current) return;

      if (updateError) {
        devError("Error updating profile avatar_url:", updateError);
        toast.error("Profil güncellenemedi");
      } else {
        setProfile((p) => ({ ...p, avatar_url: publicUrl }));
        toast.success("Avatar güncellendi! 🎉");
      }
    } catch (e) {
      devError("Catch error in handleAvatarUpload:", e);
      if (isMounted.current) toast.error("Beklenmedik bir hata oluştu");
    } finally {
      if (isMounted.current) setUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Desteklenen formatlar: JPG, PNG, GIF, WebP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Maksimum dosya boyutu: 10MB");
      return;
    }

    setUploadingBanner(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/banner.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("banners")
        .upload(path, file, { upsert: true });

      if (!isMounted.current) return;

      if (upErr) {
        devError("Error uploading banner:", upErr);
        toast.error("Banner yükleme hatası: " + upErr.message);
        setUploadingBanner(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("banners").getPublicUrl(path);

      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({ banner_url: publicUrl })
        .eq("user_id", user.id);

      if (!isMounted.current) return;

      if (updateError) {
        devError("Error updating profile banner_url:", updateError);
        toast.error("Profil güncellenemedi");
      } else {
        setProfile((p) => ({ ...p, banner_url: publicUrl }));
        toast.success("Banner güncellendi! 🖼️");
      }
    } catch (e) {
      devError("Catch error in handleBannerUpload:", e);
      if (isMounted.current) toast.error("Beklenmedik bir hata oluştu");
    } finally {
      if (isMounted.current) setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          display_name: profile.display_name,
          bio: profile.bio,
        })
        .eq("user_id", user.id);

      if (!isMounted.current) return;

      if (error) {
        devError("Error saving profile:", error);
        toast.error(error.message);
      } else {
        toast.success("Profil kaydedildi!");
      }
    } catch (e) {
      devError("Catch error in handleSave:", e);
      if (isMounted.current) toast.error("Beklenmedik bir hata oluştu");
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const confirmDelivery = async (orderId: string) => {
    try {
      const { data, error } = await supabase.rpc("confirm_delivery", {
        _order_id: orderId,
      });

      if (!isMounted.current) return;

      if (error) {
        devError("Error confirming delivery in profile:", error);
        toast.error("İşlem sırasında hata oluştu");
        return;
      }

      if (data && (data as any).success) {
        toast.success("Teslimat onaylandı! Escrow serbest bırakıldı.");
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, delivery_confirmed: true, status: "completed" } : o,
          ),
        );
      } else {
        toast.error((data as any)?.error || "Hata oluştu");
      }
    } catch (e) {
      devError("Catch error in profile confirmDelivery:", e);
      if (isMounted.current) toast.error("Beklenmedik bir hata oluştu");
    }
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Profilim</h1>

        {/* Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative rounded-lg overflow-hidden h-36 bg-secondary group"
        >
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 via-card to-primary/10" />
          )}
          <button
            onClick={() => bannerRef.current?.click()}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
          >
            {uploadingBanner ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5 text-primary" />
                <span className="text-xs font-mono text-foreground">
                  Banner Değiştir (GIF destekli)
                </span>
              </>
            )}
          </button>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*,.gif"
            className="hidden"
            onChange={handleBannerUpload}
          />
        </motion.div>

        {/* Avatar & Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-lg p-6 neon-border -mt-10 relative z-10"
        >
          <div className="flex items-start gap-6">
            <div className="relative group -mt-12">
              <div className="w-24 h-24 rounded-full bg-secondary border-4 border-card overflow-hidden flex items-center justify-center ring-2 ring-primary/30">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-primary" />
                    <span className="text-[8px] font-mono text-foreground mt-0.5">GIF ✓</span>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-1 block">
                  GÖRÜNTÜLEME ADI
                </label>
                <input
                  value={profile.display_name || ""}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-1 block">
                  BİYOGRAFİ
                </label>
                <textarea
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={2}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Kendinizi tanıtın..."
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-primary/10 text-primary uppercase">
                  {role}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{user?.email}</span>
                {user?.id && <PgpBadge userId={user.id} size="sm" />}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-mono rounded neon-glow-btn"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Kaydet
              </button>
            </div>
          </div>
        </motion.div>

        {/* Supported Formats Info */}
        <div className="glass-card rounded-lg p-3 flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            💡 Profil fotoğrafı ve banner için{" "}
            <span className="text-primary">GIF, PNG, JPG, WebP</span> formatları desteklenir.
            Hareketli GIF'ler otomatik olarak oynatılır!
          </span>
        </div>

        {/* PGP Vault */}
        <PgpVault />

        {/* Cipher Notes */}
        <CipherNotes />

        {/* Panic Mode */}
        <PanicButton />

        {/* Order History for Buyers */}
        {role === "buyer" && (
          <div>
            <h2 className="text-sm font-mono font-bold text-foreground mb-3">Sipariş Geçmişi</h2>
            {orders.length === 0 ? (
              <div className="glass-card rounded-lg p-6 text-center text-muted-foreground font-mono text-sm">
                Henüz sipariş yok.
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {o.products?.image_url ? (
                        <img
                          src={o.products.image_url}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{o.products?.image_emoji || "📦"}</span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {o.products?.name || "Ürün"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {new Date(o.created_at).toLocaleDateString("tr-TR")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-primary">
                        {o.amount} LTC
                      </span>
                      {o.status === "processing" && !o.delivery_confirmed ? (
                        <button
                          onClick={() => confirmDelivery(o.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-primary-foreground text-[10px] font-mono rounded hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Teslimatı Onayla
                        </button>
                      ) : o.delivery_confirmed ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-green-500">
                          <CheckCircle className="w-3 h-3" /> Teslim Edildi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-500">
                          <Clock className="w-3 h-3" /> {o.status}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
