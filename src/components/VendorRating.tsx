import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, ShieldCheck, Award, Zap } from "lucide-react";

interface Props {
  vendorId: string;
  size?: "sm" | "md";
  showBadges?: boolean;
}

export default function VendorRating({ vendorId, size = "sm", showBadges = false }: Props) {
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

  const stars = Math.round(avg);
  const isSm = size === "sm";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${isSm ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} ${s <= stars ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
          />
        ))}
        <span className={`font-mono text-muted-foreground ${isSm ? "text-[9px]" : "text-xs"}`}>
          {count > 0 ? `${avg} (${count})` : "Puan Yok"}
        </span>
      </div>

      {showBadges && count > 0 && (
        <div className="flex items-center gap-1.5 mt-0.5">
          {avg >= 4.5 && count >= 10 && (
            <div className="group relative">
              <Award className="w-3 h-3 text-purple-400" />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-[8px] font-mono text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                TOP SATICI
              </div>
            </div>
          )}
          {count >= 5 && (
            <div className="group relative">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-[8px] font-mono text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                DOĞRULANMIŞ
              </div>
            </div>
          )}
          {avg >= 4.0 && (
            <div className="group relative">
              <Zap className="w-3 h-3 text-yellow-400" />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-[8px] font-mono text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                HIZLI TESLİMAT
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
