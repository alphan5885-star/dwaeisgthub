import { useState } from "react";
import { useSecurity } from "@/lib/securityContext";
import { AlertTriangle, X } from "lucide-react";

/**
 * Clearnet'te ise kullanıcıyı Tor'a yönlendirmek için bir banner gösterir.
 * .onion üzerindeyse hiçbir şey gösterilmez.
 */
export default function TorWarningBanner() {
  const { isTor } = useSecurity();
  const [dismissed, setDismissed] = useState(false);

  if (isTor || dismissed) return null;
  if (typeof window === "undefined") return null;
  if (window.location.hostname.endsWith(".onion")) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-yellow-500/15 border-b border-yellow-500/40 backdrop-blur">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2 text-[11px] font-mono text-yellow-500">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1">
          <strong>CLEARNET</strong> — anonimlik için Tor Browser ile <code className="bg-yellow-500/20 px-1 rounded">.onion</code> aynamızı kullan. IP'n, ISS'n ve yasal sorumluluk sana ait.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-500/70 hover:text-yellow-500"
          aria-label="Kapat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
