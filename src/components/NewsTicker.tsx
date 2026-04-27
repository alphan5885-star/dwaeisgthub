import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { useCustomization } from "@/lib/customizationContext";

const fallbackNews = [
  "🛡️ aeigsthub v3.0 güvenliğiniz için optimize edildi.",
  "🚀 Platform güncellemeleri için forumu takip edin.",
];

export default function NewsTicker() {
  const { settings } = useCustomization();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const news = fallbackNews;

  useEffect(() => {
    if (news.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % news.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [news]);

  if (!visible || news.length === 0) return null;

  const collapsed = settings.sidebarCollapsed;
  const isRight = settings.sidebarPosition === "right";
  const margin = collapsed ? (isRight ? "mr-16" : "ml-16") : isRight ? "mr-60" : "ml-60";

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-white/5 h-8 overflow-hidden transition-[margin] duration-150 ${margin}`}
    >
      <div className="max-w-7xl mx-auto h-full flex items-center px-4">
        <div className="flex items-center gap-2 bg-primary/10 px-2 py-0.5 rounded text-primary shrink-0 border border-primary/20 mr-4">
          <Megaphone className="w-3 h-3" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-tighter">DUYURU</span>
        </div>

        <div className="flex-1 relative h-full flex items-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="text-[11px] font-mono text-foreground/80 truncate whitespace-nowrap"
            >
              {news[index]}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="ml-4 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
