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

  const links = role === "admin" ? adminLinks : role === "vendor" ? vendorLinks : buyerLinks;
  const collapsed = settings.sidebarCollapsed;
  const isRight = settings.sidebarPosition === "right";
  const width = collapsed ? "w-16" : "w-56";
  const posClass = isRight ? "right-0" : "left-0";

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
