import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, X, Send, AlertTriangle, Trash2, ShieldCheck, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSessionTimer } from "@/lib/sessionTimerContext";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant" | "system"; content: string };

type AssistantProps = {
  position?: "bottom-right" | "bottom-left";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFab?: boolean;
};

const QUICK = [
  "LTC nasıl yatırılır?",
  "Güvenlik protokolleri nelerdir?",
  "Dispute nasıl açılır?",
  "Satıcı başvurusu",
  "Escrow nasıl çalışır?",
  "PGP anahtarı ekleme",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kizilyurek-chat`;
const ALLOWED_MARKDOWN_ELEMENTS = ["p", "strong", "em", "code", "pre", "ul", "ol", "li", "br"];

export default function KizilyurekAssistant({
  position = "bottom-right",
  open: openProp,
  onOpenChange,
  hideFab = false,
}: AssistantProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = useCallback(
    (v: boolean) => {
      if (onOpenChange) onOpenChange(v);
      else setOpenInternal(v);
    },
    [onOpenChange],
  );
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const warnedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { remainingMs, expiresAt } = useSessionTimer();

  useEffect(() => {
    if (!expiresAt) return;
    if (remainingMs > 0 && remainingMs <= 5 * 60_000 && !warnedRef.current) {
      warnedRef.current = true;
      const mins = Math.ceil(remainingMs / 60_000);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `🚨 İzlerini silmek için süren doluyor Operatör. Kalan süre: ~${mins} dk`,
        },
      ]);
      setOpen(true);
    }
    if (remainingMs > 6 * 60_000) warnedRef.current = false;
  }, [remainingMs, expiresAt, setOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages((p) => [
          ...p,
          {
            role: "assistant",
            content: "⚠️ Oturum doğrulaması bulunamadı. Lütfen yeniden giriş yap.",
          },
        ]);
        setLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: next
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok || !resp.body) {
        const errText =
          resp.status === 429
            ? "Çok fazla istek. Biraz bekle."
            : resp.status === 402
              ? "AI kredisi tükendi."
              : "Bağlantı hatası.";
        setMessages((p) => [...p, { role: "assistant", content: `⚠️ ${errText}` }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let started = false;
      let done = false;

      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              if (!started) {
                started = true;
                setMessages((p) => [...p, { role: "assistant", content: acc }]);
              } else {
                setMessages((p) =>
                  p.map((m, i) => (i === p.length - 1 ? { ...m, content: acc } : m)),
                );
              }
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      setMessages((p) => [...p, { role: "assistant", content: "⚠️ Beklenmeyen bir hata oluştu." }]);
    } finally {
      setLoading(false);
    }
  };

  const cornerBtn = position === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4";
  const cornerPanel = hideFab
    ? position === "bottom-left"
      ? "bottom-4 left-60"
      : "bottom-4 right-60"
    : position === "bottom-left"
      ? "bottom-4 left-4"
      : "bottom-4 right-4";

  return (
    <>
      {!open && !hideFab && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Kızılyürek Operasyonel Destek"
          className={`fixed ${cornerBtn} z-40 w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-[0_0_20px_hsl(var(--destructive)/0.6)] hover:scale-105 transition-all`}
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div
          className={`fixed ${cornerPanel} z-40 w-[340px] h-[480px] bg-card border border-destructive/60 rounded-lg shadow-[0_0_30px_hsl(var(--destructive)/0.4)] flex flex-col overflow-hidden`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-destructive/10">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="w-4 h-4 text-destructive" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-card animate-pulse" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-mono text-sm font-bold text-destructive flex items-center gap-1">
                  Kızılyürek <Sparkles className="w-2.5 h-2.5" />
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  Operasyonel Destek
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Sohbeti Temizle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground">
                  Hoş geldin Operatör. Bir konu seç ya da yaz:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-[11px] font-mono px-2 py-1 rounded border border-border bg-background/60 hover:border-destructive hover:text-destructive transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              if (m.role === "system") {
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-2 py-2 rounded border border-destructive/60 bg-destructive/10 text-destructive text-xs font-mono"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{m.content}</span>
                  </div>
                );
              }
              const isUser = m.role === "user";
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-2.5 py-1.5 rounded text-xs leading-relaxed ${
                      isUser
                        ? "bg-primary/20 text-primary font-mono"
                        : "bg-secondary/60 text-foreground"
                    }`}
                  >
                    {isUser ? (
                      m.content
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none [&>*]:my-1">
                        <ReactMarkdown
                          allowedElements={ALLOWED_MARKDOWN_ELEMENTS}
                          skipHtml
                          urlTransform={(url) => {
                            const cleaned = url.trim().toLowerCase();
                            return cleaned.startsWith("http://") || cleaned.startsWith("https://")
                              ? url
                              : "";
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-destructive rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-destructive rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-destructive rounded-full animate-bounce"></span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                  Veri İşleniyor...
                </span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-2 border-t border-border flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sorunu yaz..."
              className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-destructive"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-2 py-1.5 rounded bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
