import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-shim";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, Store, Wallet, ShoppingCart, Lock, Palette, MessageSquare, ArrowRightLeft, User, FileWarning, ScrollText, LayoutDashboard, Heart, Bot } from "lucide-react";

type Item = { id: string; label: string; sub?: string; icon: any; action: () => void; group: string };

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [vendors, setVendors] = useState<{ user_id: string; display_name: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const toggle = () => setOpen((v) => !v);
    window.addEventListener("keydown", handler);
    window.addEventListener("palette:toggle", toggle);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("palette:toggle", toggle);
    };
  }, []);

  useEffect(() => {
    if (!open) { setQuery(""); setActiveIndex(0); return; }
    (async () => {
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from("products").select("id, name, price").gt("stock", 0).limit(20),
        supabase.from("profiles").select("user_id, display_name").limit(20),
      ]);
      setProducts((p as any) || []);
      setVendors((v as any) || []);
    })();
  }, [open]);

  const go = (path: string) => { setOpen(false); navigate(path); };

  const pages: Item[] = [
    { id: "p1", label: "Market", icon: ShoppingCart, action: () => go("/market"), group: "Sayfalar" },
    { id: "p2", label: "Siparişlerim", icon: Package, action: () => go("/orders"), group: "Sayfalar" },
    { id: "p3", label: "Cüzdan", icon: Wallet, action: () => go("/wallet"), group: "Sayfalar" },
    { id: "p4", label: "İşlemler", icon: ArrowRightLeft, action: () => go("/transactions"), group: "Sayfalar" },
    { id: "p5", label: "Forum", icon: MessageSquare, action: () => go("/forum"), group: "Sayfalar" },
    { id: "p6", label: "Güvenlik", icon: Lock, action: () => go("/security"), group: "Sayfalar" },
    { id: "p7", label: "Profil", icon: User, action: () => go("/profile"), group: "Sayfalar" },
    { id: "p8", label: "Özelleştirme", icon: Palette, action: () => go("/customization"), group: "Sayfalar" },
    { id: "p9", label: "Vendor Paneli", icon: Store, action: () => go("/vendor"), group: "Sayfalar" },
    { id: "p10", label: "Admin Dashboard", icon: LayoutDashboard, action: () => go("/admin"), group: "Sayfalar" },
    { id: "p11", label: "Disputes", icon: FileWarning, action: () => go("/admin/disputes"), group: "Sayfalar" },
    { id: "p12", label: "Security Logs", icon: ScrollText, action: () => go("/admin/security-logs"), group: "Sayfalar" },
  ];

  const actions: Item[] = [
    { id: "a1", label: "Kızılyürek AI Aç", icon: Bot, action: () => { setOpen(false); window.dispatchEvent(new CustomEvent("kizilyurek:toggle")); }, group: "Eylemler" },
  ];

  const productItems: Item[] = products.map((p) => ({
    id: `prod-${p.id}`,
    label: p.name,
    sub: `${p.price.toFixed(4)} LTC`,
    icon: Package,
    action: () => go(`/product/${p.id}`),
    group: "Ürünler",
  }));

  const vendorItems: Item[] = vendors.map((v) => ({
    id: `vendor-${v.user_id}`,
    label: v.display_name || "Anonim",
    sub: "Satıcı",
    icon: Store,
    action: () => go(`/vendor/${v.user_id}`),
    group: "Satıcılar",
  }));

  const all = [...pages, ...actions, ...productItems, ...vendorItems];
  const q = query.toLowerCase().trim();
  const filtered = q ? all.filter((i) => i.label.toLowerCase().includes(q) || i.sub?.toLowerCase().includes(q)) : all;
  const grouped: Record<string, Item[]> = {};
  filtered.forEach((i) => { (grouped[i.group] ||= []).push(i); });

  useEffect(() => { setActiveIndex(0); }, [query]);

  const flat = filtered;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); flat[activeIndex]?.action(); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl glass-card neon-border rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-primary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ürün, satıcı veya sayfa ara..."
            className="flex-1 bg-transparent outline-none text-sm font-mono text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 pt-3 pb-1 text-[10px] font-mono text-muted-foreground uppercase">{group}</div>
              {items.map((item) => {
                const idx = flat.indexOf(item);
                const active = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-all ${active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary/40"}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.sub && <span className="text-[10px] font-mono text-muted-foreground">{item.sub}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {flat.length === 0 && (
            <div className="px-4 py-8 text-center text-sm font-mono text-muted-foreground">Sonuç yok</div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>↑↓ gez · ↵ aç</span>
          <span>⌘K aç/kapat</span>
        </div>
      </div>
    </div>
  );
}
