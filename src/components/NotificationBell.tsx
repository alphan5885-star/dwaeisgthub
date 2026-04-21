import { useState, useEffect, useRef } from "react";
import { Bell, Package, MessageSquare, AlertTriangle, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: "order" | "message" | "dispute" | "system";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link?: string;
}

const typeIcon = {
  order: Package,
  message: MessageSquare,
  dispute: AlertTriangle,
  system: Bell,
};

const typeColor = {
  order: "text-green-500",
  message: "text-blue-400",
  dispute: "text-yellow-500",
  system: "text-primary",
};

export default function NotificationBell() {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    // Real-time subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as any;
          setNotifications((prev) => [{
            id: n.id,
            type: n.type || "system",
            title: n.title,
            body: n.body,
            read: false,
            created_at: n.created_at,
            link: n.link,
          }, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) {
      setNotifications(data.map((n: any) => ({
        id: n.id,
        type: n.type || "system",
        title: n.title,
        body: n.body,
        read: n.read || false,
        created_at: n.created_at,
        link: n.link,
      })));
    }
  };

  const markAsRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "şimdi";
    if (mins < 60) return `${mins}dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa`;
    return `${Math.floor(hours / 24)}g`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute left-0 top-12 w-80 glass-card neon-border rounded-lg shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-mono font-bold text-foreground">Bildirimler</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tümünü oku
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs font-mono text-muted-foreground">Bildirim yok</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcon[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors ${
                        !n.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className={`mt-0.5 ${typeColor[n.type] || "text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono ${!n.read ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                            {n.title}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground ml-2 shrink-0">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
