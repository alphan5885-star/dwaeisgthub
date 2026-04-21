import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Truck, MapPin, Mail, Package, Navigation } from "lucide-react";
import DeadDropMap from "./DeadDropMap";

interface Props {
  orderId: string;
  deliveryMethod: string;
  isVendor?: boolean;
}

export default function OrderDeliveryInfo({ orderId, deliveryMethod, isVendor }: Props) {
  const [tracking, setTracking] = useState<any>(null);
  const [deadDrop, setDeadDrop] = useState<any>(null);

  useEffect(() => {
    if (deliveryMethod === "cargo") {
      supabase.from("shipping_tracking").select("*").eq("order_id", orderId).maybeSingle().then(({ data }) => setTracking(data));
    }
    if (deliveryMethod === "dead_drop") {
      supabase.from("dead_drop_locations").select("*").eq("order_id", orderId).maybeSingle().then(({ data }) => setDeadDrop(data));
    }
  }, [orderId, deliveryMethod]);

  if (deliveryMethod === "cargo") {
    if (!tracking) return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-2">
        <Truck className="w-3 h-3" /> Kargo bilgisi bekleniyor...
      </div>
    );
    return (
      <div className="mt-2 bg-secondary/50 rounded p-2 space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-mono text-orange-400">
          <Truck className="w-3 h-3" /> {tracking.carrier.toUpperCase()} — {tracking.tracking_code}
        </div>
        <div className="text-[9px] font-mono text-muted-foreground">Durum: {tracking.status}</div>
      </div>
    );
  }

  if (deliveryMethod === "dead_drop") {
    if (!deadDrop) return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-2">
        <MapPin className="w-3 h-3" /> Dead-drop konumu bekleniyor...
      </div>
    );
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-mono text-green-400">
          <MapPin className="w-3 h-3" /> Dead-Drop Konumu
        </div>
        <DeadDropMap mode="view" latitude={Number(deadDrop.latitude)} longitude={Number(deadDrop.longitude)} />
        {deadDrop.instructions && (
          <div className="text-[10px] font-mono text-muted-foreground bg-secondary/50 rounded p-2">
            <Navigation className="w-3 h-3 inline mr-1" />
            {deadDrop.instructions}
          </div>
        )}
        {deadDrop.photo_url && (
          <img src={deadDrop.photo_url} alt="Dead drop" className="w-full h-32 object-cover rounded" />
        )}
      </div>
    );
  }

  if (deliveryMethod === "mailbox") {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-2">
        <Mail className="w-3 h-3" /> Anonim posta kutusu teslimatı
      </div>
    );
  }

  return null;
}
