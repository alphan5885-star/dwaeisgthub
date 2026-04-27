import { useState, useEffect, useRef, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Clock,
  User,
  ChevronRight,
  Send,
  ArrowLeft,
  Pin,
  Lock,
  Tag,
  Search,
  Filter,
  MessageCircle,
  Eye,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ForumThread {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  category: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  reply_count: number;
  view_count: number;
  last_reply_at: string | null;
}

interface ForumReply {
  id: string;
  thread_id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

const CATEGORIES = [
  { id: "genel", label: "Genel", color: "text-blue-400" },
  { id: "duyurular", label: "Duyurular", color: "text-yellow-400" },
  { id: "yardim", label: "Yardim", color: "text-green-400" },
  { id: "oneriler", label: "Oneriler", color: "text-purple-400" },
  { id: "sikayet", label: "Sikayet", color: "text-red-400" },
];

// In-memory storage for forum data (simulating database)
const forumStorage = {
  threads: [] as ForumThread[],
  replies: [] as ForumReply[],
  initialized: false,
};

export default function Forum() {
  const { user, role } = useAuth();
  const isMounted = useRef(true);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThread, setNewThread] = useState({ title: "", content: "", category: "genel" });
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  const loadThreads = useCallback(() => {
    const sorted = [...forumStorage.threads].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setThreads(sorted);
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted.current) return;

      if (error) {
        if (import.meta.env.DEV) console.error("Error loading forum profile:", error);
        return;
      }

      if (data?.display_name) {
        setDisplayName(data.display_name);
      } else {
        setDisplayName(user.email?.split("@")[0] || "Anonim");
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error("Catch error in loadUserProfile:", e);
    }
  }, [user]);

  useEffect(() => {
    isMounted.current = true;
    // Initialize with demo data if empty
    if (!forumStorage.initialized) {
      // ... (existing initialization code)
      forumStorage.threads = [
        {
          id: "1",
          title: "Platforma Hos Geldiniz",
          content:
            "Bu platform hakkinda sorularinizi buradan sorabilirsiniz. Kurallara uymayi unutmayin.",
          author_id: "system",
          author_name: "Admin",
          category: "duyurular",
          is_pinned: true,
          is_locked: false,
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
          reply_count: 2,
          view_count: 156,
          last_reply_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "2",
          title: "Guvenlik Onerilerimiz",
          content:
            "Islemlerinizde dikkat etmeniz gereken guvenlik onlemleri:\n\n1. Sifrenizi kimseyle paylasmayiniz\n2. 2FA etkinlestirin\n3. Supheli mesajlara dikkat edin",
          author_id: "system",
          author_name: "Admin",
          category: "duyurular",
          is_pinned: true,
          is_locked: true,
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          reply_count: 0,
          view_count: 89,
          last_reply_at: null,
        },
        {
          id: "3",
          title: "Odeme islemi ne kadar suruyor?",
          content:
            "Merhaba, LTC ile odeme yaptim ama henuz onaylanmadi. Ne kadar beklemem gerekiyor?",
          author_id: "user1",
          author_name: "Kullanici42",
          category: "yardim",
          is_pinned: false,
          is_locked: false,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          reply_count: 3,
          view_count: 45,
          last_reply_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
      ];
      forumStorage.replies = [
        {
          id: "r1",
          thread_id: "1",
          content: "Tesekkurler bilgilendirme icin!",
          author_id: "user2",
          author_name: "AnonymUser",
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: "r2",
          thread_id: "1",
          content: "Yeni uyeler icin cok faydali.",
          author_id: "user3",
          author_name: "Shadow99",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "r3",
          thread_id: "3",
          content:
            "LTC islemleri genelde 10-30 dakika icinde onaylanir. Ag yogunluguna gore degisebilir.",
          author_id: "user4",
          author_name: "VendorX",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      forumStorage.initialized = true;
    }

    const load = async () => {
      if (!isMounted.current) return;
      loadThreads();
      await loadUserProfile();
    };

    load();
    return () => {
      isMounted.current = false;
    };
  }, [loadThreads, loadUserProfile]);

  const loadReplies = (threadId: string) => {
    const threadReplies = forumStorage.replies
      .filter((r) => r.thread_id === threadId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setReplies(threadReplies);
  };

  const openThread = (thread: ForumThread) => {
    // Increment view count
    const idx = forumStorage.threads.findIndex((t) => t.id === thread.id);
    if (idx !== -1) {
      forumStorage.threads[idx].view_count++;
    }
    setSelectedThread(thread);
    loadReplies(thread.id);
  };

  const createThread = () => {
    if (!newThread.title.trim() || !newThread.content.trim() || !user) return;
    setLoading(true);

    const thread: ForumThread = {
      id: `t-${Date.now()}`,
      title: newThread.title,
      content: newThread.content,
      author_id: user.id,
      author_name: displayName,
      category: newThread.category,
      is_pinned: false,
      is_locked: false,
      created_at: new Date().toISOString(),
      reply_count: 0,
      view_count: 0,
      last_reply_at: null,
    };

    forumStorage.threads.unshift(thread);
    loadThreads();
    setNewThread({ title: "", content: "", category: "genel" });
    setNewThreadOpen(false);
    setLoading(false);
  };

  const createReply = () => {
    if (!newReply.trim() || !selectedThread || !user || selectedThread.is_locked) return;
    setLoading(true);

    const reply: ForumReply = {
      id: `r-${Date.now()}`,
      thread_id: selectedThread.id,
      content: newReply,
      author_id: user.id,
      author_name: displayName,
      created_at: new Date().toISOString(),
    };

    forumStorage.replies.push(reply);

    // Update thread stats
    const idx = forumStorage.threads.findIndex((t) => t.id === selectedThread.id);
    if (idx !== -1) {
      forumStorage.threads[idx].reply_count++;
      forumStorage.threads[idx].last_reply_at = new Date().toISOString();
    }

    loadReplies(selectedThread.id);
    setNewReply("");
    setLoading(false);
  };

  const deleteThread = (threadId: string) => {
    forumStorage.threads = forumStorage.threads.filter((t) => t.id !== threadId);
    forumStorage.replies = forumStorage.replies.filter((r) => r.thread_id !== threadId);
    loadThreads();
    setSelectedThread(null);
  };

  const filteredThreads = threads.filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
  };

  // Thread Detail View
  if (selectedThread) {
    return (
      <PageShell>
        <div className="mb-6">
          <button
            onClick={() => setSelectedThread(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri Don
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-lg p-6 mb-4"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {selectedThread.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
                {selectedThread.is_locked && <Lock className="w-4 h-4 text-red-400" />}
                <span
                  className={`text-xs font-mono ${getCategoryInfo(selectedThread.category).color}`}
                >
                  [{getCategoryInfo(selectedThread.category).label.toUpperCase()}]
                </span>
              </div>
              <h1 className="text-xl font-bold text-foreground">{selectedThread.title}</h1>
            </div>
            {(role === "admin" || selectedThread.author_id === user?.id) && (
              <button
                onClick={() => deleteThread(selectedThread.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono mb-4 pb-4 border-b border-border">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {selectedThread.author_name}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(selectedThread.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {selectedThread.view_count}
            </span>
          </div>

          <div className="text-sm text-foreground/90 whitespace-pre-wrap">
            {selectedThread.content}
          </div>
        </motion.div>

        {/* Replies */}
        <div className="space-y-3 mb-4">
          <h2 className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Yanitlar ({replies.length})
          </h2>

          <AnimatePresence>
            {replies.map((reply, idx) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card rounded-lg p-4"
              >
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                    {reply.author_name[0].toUpperCase()}
                  </div>
                  <span>{reply.author_name}</span>
                  <span className="opacity-50">|</span>
                  <span>
                    {format(new Date(reply.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                  </span>
                </div>
                <div className="text-sm text-foreground/90 pl-9">{reply.content}</div>
              </motion.div>
            ))}
          </AnimatePresence>

          {replies.length === 0 && (
            <div className="glass-card rounded-lg p-8 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                Henuz yanit yok. Ilk yaniti siz yazin!
              </p>
            </div>
          )}
        </div>

        {/* Reply Form */}
        {!selectedThread.is_locked ? (
          <div className="glass-card rounded-lg p-4">
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Yanitinizi yazin..."
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-3"
            />
            <button
              onClick={createReply}
              disabled={loading || !newReply.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Yanit Gonder
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-lg p-4 text-center">
            <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-mono">
              Bu konu kilitlenmistir. Yanit yazilamaz.
            </p>
          </div>
        )}
      </PageShell>
    );
  }

  // Thread List View
  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Forum
        </h1>
        <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono hover:opacity-90 transition-all neon-glow-btn">
              <Plus className="w-4 h-4" />
              Yeni Konu
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono">Yeni Konu Olustur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">
                  Kategori
                </label>
                <select
                  value={newThread.category}
                  onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.filter((c) => c.id !== "duyurular" || role === "admin").map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Baslik</label>
                <input
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                  placeholder="Konu basligi..."
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Icerik</label>
                <textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  placeholder="Konu icerigini yazin..."
                  rows={5}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
              <button
                onClick={createThread}
                disabled={loading || !newThread.title.trim() || !newThread.content.trim()}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-mono font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                Konuyu Olustur
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Konu ara..."
            className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-lg border border-border overflow-x-auto">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 text-[10px] font-mono rounded-md transition-all whitespace-nowrap ${
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            TUMU
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-[10px] font-mono rounded-md transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      {filteredThreads.length === 0 ? (
        <div className="glass-card rounded-lg p-12 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <div className="text-muted-foreground font-mono text-sm">Konu bulunamadi.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredThreads.map((thread, idx) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => openThread(thread)}
              className="glass-card rounded-lg p-4 cursor-pointer hover:neon-border transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {thread.is_pinned && <Pin className="w-3 h-3 text-yellow-400" />}
                    {thread.is_locked && <Lock className="w-3 h-3 text-red-400" />}
                    <span
                      className={`text-[10px] font-mono ${getCategoryInfo(thread.category).color}`}
                    >
                      [{getCategoryInfo(thread.category).label.toUpperCase()}]
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {thread.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {thread.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {thread.author_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(thread.created_at), "dd MMM", { locale: tr })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {thread.reply_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {thread.view_count}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
