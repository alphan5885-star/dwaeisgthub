import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/lib/authContext";
import { useCustomization } from "@/lib/customizationContext";
import { useStealth } from "@/lib/stealthContext";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useLocation, Link } from "@/lib/router-shim";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  LayoutDashboard,
  ShoppingCart,
  Store,
  Wallet,
  FileWarning,
  ScrollText,
  LogOut,
  ArrowRightLeft,
  User,
  Package,
  Lock,
  Coins,
  MessageSquare,
  Palette,
  ShoppingBag,
  Bot,
  Heart,
  Search,
  Activity,
  ListChecks,
  EyeOff,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";

type LinkDef = { to: string; labelKey: string; icon: any };

const groupedLinks = {
  main: [
    { to: "/market", labelKey: "market", icon: ShoppingCart },
    { to: "/orders", labelKey: "myOrders", icon: Package },
    { to: "/watchlist", labelKey: "watchlist", icon: Heart },
  ],
  financial: [
    { to: "/wallet", labelKey: "wallet", icon: Coins },
    { to: "/transactions", labelKey: "transactions", icon: ArrowRightLeft },
  ],
  community: [
    { to: "/forum", labelKey: "forum", icon: MessageSquare },
    { to: "/pgp-tool", labelKey: "pgpTool", icon: Shield },
  ],
  account: [
    { to: "/profile", labelKey: "profile", icon: User },
    { to: "/security", labelKey: "security", icon: Lock },
    { to: "/customization", labelKey: "customize", icon: Palette },
  ],
  vendor: [
    { to: "/vendor", labelKey: "myProducts", icon: Store },
    { to: "/vendor/wallet", labelKey: "wallet", icon: Wallet },
    { to: "/vendor/bond", labelKey: "deposit", icon: Coins },
  ],
  admin: [
    { to: "/admin", labelKey: "dashboard", icon: LayoutDashboard },
    { to: "/admin/store", labelKey: "store", icon: ShoppingBag },
    { to: "/admin/security-logs", labelKey: "securityLogs", icon: ScrollText },
    { to: "/admin/disputes", labelKey: "disputes", icon: FileWarning },
  ],
};

import NotificationBell from "@/components/NotificationBell";
import TorBadge from "@/components/TorBadge";

function getLaunchCountdown() {
  const now = new Date();
  const launch = new Date(now.getFullYear(), 4, 10, 0, 0, 0);
  if (now > launch) launch.setFullYear(now.getFullYear() + 1);
  const days = Math.max(0, Math.ceil((launch.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return days;
}

export default function AppSidebar() {
  const { role, user, logout } = useAuth();
  const isMounted = useRef(true);
  const fetchSeq = useRef(0);
  const { settings, updateSettings } = useCustomization();
  const collapsed = settings.sidebarCollapsed;
  const isRight = settings.sidebarPosition === "right";
  const width = collapsed ? "w-[60px]" : "w-[240px]";
  const posClass = isRight ? "right-0" : "left-0";

  const { toggleStealth } = useStealth() || { toggleStealth: () => {} };
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [activity, setActivity] = useState<
    { id: string; title: string; created_at: string; link?: string | null }[]
  >([]);
  const [stats, setStats] = useState<{ orders: number; favs: number }>({ orders: 0, favs: 0 });
  const [securityStatus, setSecurityStatus] = useState<{ hasPgp: boolean; hasPin: boolean }>({
    hasPgp: false,
    hasPin: false,
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(["Pazar"]);
  const [showActivity, setShowActivity] = useState(false);
  const [torCircuit, setTorCircuit] = useState<string[]>([]);

  const anonymityScore = useMemo(() => {
    let score = 60; // Base score
    if (securityStatus.hasPgp) score += 20;
    if (securityStatus.hasPin) score += 15;
    // Stealth mode check can be added if available in context
    return Math.min(score, 100);
  }, [securityStatus]);

  useEffect(() => {
    // Persistent Tor circuit for the session
    const saved = sessionStorage.getItem("tor_circuit");
    if (saved) {
      setTorCircuit(JSON.parse(saved));
    } else {
      const nodes = ["Entry", "Middle", "Exit"];
      const circuit = nodes.map(
        (n) => `${n}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      );
      setTorCircuit(circuit);
      sessionStorage.setItem("tor_circuit", JSON.stringify(circuit));
    }
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const renderLink = (link: LinkDef) => {
    const active = location.pathname === link.to;
    const label = t(link.labelKey as any);
    return (
      <Link
        key={link.to}
        to={link.to}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-[13px] transition-all ${
          active
            ? "bg-primary/10 text-primary font-bold"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        } ${collapsed ? "justify-center" : ""}`}
      >
        <link.icon className={`${active ? "w-4 h-4" : "w-3.5 h-3.5"} shrink-0`} />
        {!collapsed && label}
      </Link>
    );
  };

  const renderSection = (title: string, links: LinkDef[]) => {
    if (collapsed) return links.map(renderLink);
    const isExpanded = expandedSections.includes(title);

    return (
      <div className="mb-2">
        <button
          onClick={() => toggleSection(title)}
          className="w-full px-3 py-1 mb-1 text-[10px] font-mono font-bold text-muted-foreground/50 hover:text-muted-foreground uppercase tracking-widest flex items-center justify-between transition-colors group"
        >
          <span>{title}</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
          />
        </button>
        {isExpanded && <div className="space-y-0.5">{links.map(renderLink)}</div>}
      </div>
    );
  };

  useEffect(() => {
    if (!user || collapsed) return;
    isMounted.current = true;
    const seq = ++fetchSeq.current;

    const timer = setTimeout(async () => {
      try {
        const [
          { data: notifs },
          { count: orderCount },
          { count: favCount },
          { data: pgpKey },
          { data: profile },
        ] = await Promise.all([
          supabase
            .from("notifications")
            .select("id, title, created_at, link")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("buyer_id", user.id),
          supabase
            .from("watchlist")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase.from("user_pgp_keys").select("id").eq("user_id", user.id).maybeSingle(),
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        if (isMounted.current && fetchSeq.current === seq) {
          setActivity((notifs as any) || []);
          setStats({ orders: orderCount || 0, favs: favCount || 0 });

          // Safe access to profile data
          const profileData = profile as any;
          setSecurityStatus({
            hasPgp: !!pgpKey,
            hasPin: !!(profileData && (profileData.withdraw_pin_hash as any)),
          });
        }
      } catch (err: any) {
        // Suppress noisy logs in production-like environment
        if (import.meta.env.DEV && isMounted.current) {
          console.debug("Sidebar data fetch ignored or failed", err.message);
        }
      }
    }, 250);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [user, collapsed]);

  return (
    <aside
      className={`fixed ${posClass} top-0 h-screen ${width} bg-card ${isRight ? "border-l" : "border-r"} border-border flex flex-col z-50 transition-[width] duration-150`}
    >
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-mono text-sm font-bold text-primary neon-text">aeigsthub</span>
        )}
        <div className={`${collapsed ? "" : "ml-auto"} flex items-center gap-2`}>
          <button
            onClick={toggleStealth}
            title="Stealth Mode"
            className="p-1.5 text-yellow-500/80 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-md transition-all"
          >
            <EyeOff className="w-4 h-4" />
          </button>
          <NotificationBell />
          {!collapsed && <span className="text-[8px] font-mono text-muted-foreground">v3.0</span>}
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("palette:toggle"))}
          title={collapsed ? "Hızlı ara (⌘K)" : undefined}
          className={`w-full mb-4 flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground border border-white/5 transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Hızlı ara</span>
              <kbd className="text-[9px] font-mono opacity-40">⌘K</kbd>
            </>
          )}
        </button>

        {renderSection("Pazar", groupedLinks.main)}
        {renderSection("Finans", groupedLinks.financial)}

        {role === "admin" && renderSection("Yönetim", groupedLinks.admin)}
        {role === "vendor" && renderSection("Satıcı", groupedLinks.vendor)}

        {renderSection("Topluluk", groupedLinks.community)}
        {renderSection("Hesap", groupedLinks.account)}

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("kizilyurek:toggle"))}
          title={collapsed ? "Kızılyürek AI" : undefined}
          className={`w-full mt-2 flex items-center gap-2 px-3 py-2 rounded text-xs transition-all bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 ${collapsed ? "justify-center" : ""}`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          {!collapsed && "Kızılyürek AI"}
        </button>

        {!collapsed && activity.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <button
              onClick={() => setShowActivity(!showActivity)}
              className="w-full flex items-center justify-between px-3 mb-2 group"
            >
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
                  Son Bildirimler
                </span>
              </div>
              <ChevronDown
                className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${showActivity ? "" : "-rotate-90"}`}
              />
            </button>
            {showActivity && (
              <div className="space-y-1 px-1">
                {activity.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => a.link && navigate(a.link)}
                    className="w-full text-left p-2 rounded hover:bg-secondary/30 transition-all border border-transparent hover:border-white/5"
                  >
                    <div className="text-[10px] font-mono text-foreground/80 truncate">
                      {a.title}
                    </div>
                    <div className="text-[8px] font-mono text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-border bg-secondary/10 space-y-2">
        <TorBadge collapsed={collapsed} />

        {!collapsed && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <div
              className="flex-1 flex items-center gap-1 px-1.5 py-1 bg-background/40 rounded border border-white/5 text-[8px] font-mono group relative cursor-help"
              title={torCircuit.join(" -> ")}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground uppercase">Tor</span>
              <span className="text-primary font-bold ml-auto">
                {torCircuit[2]?.split("_")[1] || "..."}
              </span>
            </div>
            <div
              className="flex-1 flex items-center gap-1 px-1.5 py-1 bg-background/40 rounded border border-white/5 text-[8px] font-mono cursor-help"
              title={`PGP: ${securityStatus.hasPgp ? "Var" : "Yok"} | PIN: ${securityStatus.hasPin ? "Aktif" : "Pasif"}`}
            >
              <ShieldAlert
                className={`w-2 h-2 ${anonymityScore > 80 ? "text-green-500" : "text-yellow-500"}`}
              />
              <span className="text-muted-foreground uppercase">Anon</span>
              <span
                className={`${anonymityScore > 80 ? "text-green-500" : "text-yellow-500"} font-bold ml-auto`}
              >
                %{anonymityScore}
              </span>
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-1 p-1 bg-background/40 rounded border border-white/5">
            {["LTC", "XMR", "USD"].map((c) => (
              <button
                key={c}
                onClick={() => updateSettings({ preferredCurrency: c as any })}
                className={`flex-1 text-[8px] font-mono py-0.5 rounded transition-all ${
                  settings.preferredCurrency === c
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-2 p-1.5 bg-primary/5 rounded-lg border border-primary/10">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-mono text-primary border border-primary/20">
              {(user?.email?.[0] || "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-foreground font-mono truncate font-bold leading-tight">
                {user?.email?.split("@")[0]}
              </div>
              <div className="text-[8px] font-mono text-primary/70 uppercase tracking-tighter">
                {role}
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title={t("logout")}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="w-full flex justify-center p-2 text-destructive hover:bg-destructive/10 rounded transition-all"
            title={t("logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
