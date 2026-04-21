import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useCustomization } from "@/lib/customizationContext";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useLocation } from "@/lib/router-shim";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LayoutDashboard, ShoppingCart, Store, Wallet, FileWarning, ScrollText, LogOut, ArrowRightLeft, User, Package, Lock, Coins, MessageSquare, Palette, ShoppingBag, Bot, Heart, Search, Activity } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type LinkDef = { to: string; labelKey: string; icon: any };

const adminLinks: LinkDef[] = [
  { to: "/admin", labelKey: "dashboard", icon: LayoutDashboard },
  { to: "/admin/store", labelKey: "store", icon: ShoppingBag },
  { to: "/market", labelKey: "market", icon: ShoppingCart },
  { to: "/orders", labelKey: "myOrders", icon: Package },
  { to: "/vendor", labelKey: "myProducts", icon: Store },
  { to: "/wallet", labelKey: "wallet", icon: Coins },
  { to: "/vendor/wallet", labelKey: "wallet", icon: Wallet },
  { to: "/admin/security-logs", labelKey: "securityLogs", icon: ScrollText },
  { to: "/admin/disputes", labelKey: "disputes", icon: FileWarning },
  { to: "/transactions", labelKey: "transactions", icon: ArrowRightLeft },
  { to: "/forum", labelKey: "forum", icon: MessageSquare },
  { to: "/security", labelKey: "security", icon: Lock },
  { to: "/customization", labelKey: "customize", icon: Palette },
];

const vendorLinks: LinkDef[] = [
  { to: "/vendor", labelKey: "myProducts", icon: Store },
  { to: "/market", labelKey: "market", icon: ShoppingCart },
  { to: "/watchlist", labelKey: "watchlist", icon: Heart },
  { to: "/orders", labelKey: "myOrders", icon: Package },
  { to: "/wallet", labelKey: "wallet", icon: Coins },
  { to: "/vendor/wallet", labelKey: "wallet", icon: Wallet },
  { to: "/vendor/bond", labelKey: "deposit", icon: Coins },
  { to: "/transactions", labelKey: "transactions", icon: ArrowRightLeft },
  { to: "/forum", labelKey: "forum", icon: MessageSquare },
  { to: "/security", labelKey: "security", icon: Lock },
  { to: "/profile", labelKey: "profile", icon: User },
  { to: "/customization", labelKey: "customize", icon: Palette },
];

const buyerLinks: LinkDef[] = [
  { to: "/market", labelKey: "market", icon: ShoppingCart },
  { to: "/watchlist", labelKey: "watchlist", icon: Heart },
  { to: "/orders", labelKey: "myOrders", icon: Package },
  { to: "/wallet", labelKey: "wallet", icon: Coins },
  { to: "/transactions", labelKey: "transactions", icon: ArrowRightLeft },
  { to: "/forum", labelKey: "forum", icon: MessageSquare },
  { to: "/security", labelKey: "security", icon: Lock },
  { to: "/profile", labelKey: "profile", icon: User },
  { to: "/customization", labelKey: "customize", icon: Palette },
];

export default function AppSidebar() {
  const { role, user, logout } = useAuth();
  const { settings } = useCustomization();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [activity, setActivity] = useState<{ id: string; title: string; created_at: string; link?: string | null }[]>([]);
  const [stats, setStats] = useState<{ orders: number; favs: number }>({ orders: 0, favs: 0 });

  const links = role === "admin" ? adminLinks : role === "vendor" ? vendorLinks : buyerLinks;
  const collapsed = settings.sidebarCollapsed;
  const isRight = settings.sidebarPosition === "right";
  const width = collapsed ? "w-16" : "w-60";
  const posClass = isRight ? "right-0" : "left-0";

  useEffect(() => {
    if (!user || collapsed) return;
    (async () => {
      const [{ data: notifs }, { count: orderCount }, { count: favCount }] = await Promise.all([
        supabase.from("notifications").select("id, title, created_at, link").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
        (supabase as any).from("watchlist").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setActivity((notifs as any) || []);
      setStats({ orders: orderCount || 0, favs: favCount || 0 });
    })();
  }, [user, collapsed, location.pathname]);

  return (
    <aside className={`fixed ${posClass} top-0 h-screen ${width} bg-card border-${isRight ? "l" : "r"} border-border flex flex-col z-50 transition-all duration-300`}>
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        {!collapsed && <span className="font-mono text-sm font-bold text-primary neon-text">aeigsthub</span>}
        <div className={`${collapsed ? "" : "ml-auto"} flex items-center gap-2`}>
          <NotificationBell />
          {!collapsed && <span className="text-[8px] font-mono text-muted-foreground">v3.0</span>}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("palette:toggle"))}
          title={collapsed ? "Hızlı ara (⌘K)" : undefined}
          className={`w-full mb-2 flex items-center gap-2 px-3 py-2 rounded text-sm bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all border border-border ${collapsed ? "justify-center" : ""}`}
        >
          <Search className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-xs">Hızlı ara</span>
              <kbd className="text-[9px] font-mono border border-border px-1 rounded">⌘K</kbd>
            </>
          )}
        </button>

        {links.map((link) => {
          const active = location.pathname === link.to;
          const label = t(link.labelKey as any);
          return (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                active ? "bg-primary/10 text-primary neon-border" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <link.icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </button>
          );
        })}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("kizilyurek:toggle"))}
          title={collapsed ? "Kızılyürek" : undefined}
          className={`w-full mt-1 flex items-center gap-2 px-3 py-2 rounded text-sm transition-all text-destructive hover:bg-destructive/10 border border-destructive/30 ${collapsed ? "justify-center" : ""}`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          {!collapsed && "Kızılyürek"}
        </button>

        {!collapsed && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Aktivite</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-secondary/40 rounded p-2">
                <div className="text-[9px] font-mono text-muted-foreground">Sipariş</div>
                <div className="text-sm font-mono font-bold text-primary">{stats.orders}</div>
              </div>
              <div className="bg-secondary/40 rounded p-2">
                <div className="text-[9px] font-mono text-muted-foreground">Favori</div>
                <div className="text-sm font-mono font-bold text-destructive">{stats.favs}</div>
              </div>
            </div>
            {activity.length > 0 ? (
              <div className="space-y-1">
                {activity.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => a.link && navigate(a.link)}
                    className="w-full text-left p-2 rounded bg-secondary/20 hover:bg-secondary/60 transition-all"
                  >
                    <div className="text-[10px] font-mono text-foreground truncate">{a.title}</div>
                    <div className="text-[9px] font-mono text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-muted-foreground text-center py-2">Aktivite yok</div>
            )}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-mono text-primary">
              {(user?.email?.[0] || "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground font-mono truncate">{user?.email}</div>
              <div className="text-[10px] font-mono text-primary">{role?.toUpperCase()}</div>
            </div>
          </div>
        )}
        <button
          onClick={async () => { await logout(); navigate("/"); }}
          title={collapsed ? t("logout") : undefined}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-destructive hover:bg-destructive/10 transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && t("logout")}
        </button>
      </div>
    </aside>
  );
}
