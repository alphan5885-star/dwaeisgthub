import { useLocation } from "@/lib/router-shim";
import { useEffect } from "react";
import { Shield, AlertTriangle, Home } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,51,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,51,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <Shield className="w-10 h-10 text-primary animate-pulse" />
          <span className="font-mono text-2xl font-bold text-primary neon-text">aeigsthub</span>
        </div>

        <div className="glass-card neon-border rounded-lg p-8 max-w-md">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <h1 className="text-5xl font-mono font-bold text-primary neon-text">404</h1>
          </div>

          <p className="text-muted-foreground font-mono text-sm mb-2">Sayfa bulunamadi.</p>
          <p className="text-muted-foreground/60 font-mono text-xs mb-6">
            Aranan yol:{" "}
            <code className="bg-secondary px-1.5 py-0.5 rounded">{location.pathname}</code>
          </p>

          <a
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-mono text-sm font-bold hover:opacity-90 transition-all neon-glow-btn"
          >
            <Home className="w-4 h-4" />
            Ana Sayfa
          </a>
        </div>

        <p className="text-[10px] font-mono text-muted-foreground mt-4 opacity-50">
          Guvenli baglanti korunuyor
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;
