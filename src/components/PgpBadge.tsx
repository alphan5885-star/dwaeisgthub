import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Key } from "lucide-react";
import { formatFingerprint } from "@/lib/pgp";

interface Props {
  userId: string;
  size?: "sm" | "md";
  showFingerprint?: boolean;
}

interface KeyRow {
  fingerprint: string;
  verified: boolean;
}

export default function PgpBadge({ userId, size = "sm", showFingerprint = false }: Props) {
  const [key, setKey] = useState<KeyRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_pgp_keys")
        .select("fingerprint, verified")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setKey((data as KeyRow | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!key) return null;

  const isMd = size === "md";
  return (
    <span
      title={`PGP Verified — ${formatFingerprint(key.fingerprint)}`}
      className={`inline-flex items-center gap-1 font-mono rounded ${isMd ? "px-2 py-1 text-[11px]" : "px-1.5 py-0.5 text-[10px]"} ${key.verified ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-primary/10 text-primary border border-primary/30"}`}
    >
      {key.verified ? (
        <ShieldCheck className={isMd ? "w-3.5 h-3.5" : "w-3 h-3"} />
      ) : (
        <Key className={isMd ? "w-3.5 h-3.5" : "w-3 h-3"} />
      )}
      PGP {key.verified ? "VERIFIED" : "READY"}
      {showFingerprint && <span className="opacity-70">· {key.fingerprint.slice(-8)}</span>}
    </span>
  );
}
