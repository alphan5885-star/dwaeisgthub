import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

interface Props {
  vendorId: string;
  size?: "sm" | "md";
}

export default function VendorRating({ vendorId, size = "sm" }: Props) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.rpc("get_vendor_rating", { _vendor_id: vendorId }).then(({ data }) => {
      if (data) {
        const d = data as any;
        setAvg(d.average || 0);
        setCount(d.count || 0);
      }
    });
  }, [vendorId]);

  if (count === 0) return <span className="text-[10px] font-mono text-muted-foreground">Henüz puan yok</span>;

  const stars = Math.round(avg);
  const isSm = size === "sm";

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${isSm ? "w-3 h-3" : "w-4 h-4"} ${s <= stars ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
        />
      ))}
      <span className={`font-mono text-muted-foreground ${isSm ? "text-[10px]" : "text-xs"}`}>
        {avg} ({count})
      </span>
    </div>
  );
}
