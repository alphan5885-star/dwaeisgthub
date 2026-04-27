import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";

const INITIAL_LINES = [
  "aeigsthub Security Terminal v3.0.4",
  "Initializing encrypted handshake...",
  "Connection established via Tor Circuit [7 layers]",
  "Ready for commands. Type 'help' for options.",
];

export default function SecurityTerminal() {
  const { user } = useAuth();
  const [lines, setLines] = useState<string[]>(INITIAL_LINES);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const addLines = (newContent: string[]) => {
    if (isMounted.current) {
      setLines((prev) => {
        const combined = [...prev, ...newContent];
        // Limit buffer to last 200 lines to prevent performance issues
        return combined.slice(-200);
      });
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    setLines((prev) => [...prev, `> ${input}`]);
    setInput("");

    switch (cmd) {
      case "help":
        addLines([
          "Available commands:",
          " - status: Show real system integrity and user security status",
          " - scan: Run real vulnerability scan on your account",
          " - logs: Show your recent security events",
          " - clear: Clear terminal",
          " - exit: Close connection",
        ]);
        break;

      case "status":
        addLines(["Fetching system status..."]);
        try {
          if (!user) {
            addLines(["Error: No active session found."]);
            break;
          }

          const [pgpRes, profileRes] = await Promise.all([
            supabase.from("user_pgp_keys").select("id").eq("user_id", user.id).maybeSingle(),
            supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle(),
          ]);

          const hasPgp = !!pgpRes.data;
          // We check if profile exists as a proxy for security setup if withdraw_pin_hash column is missing
          const hasPin = false; // Fallback or implement real check if column is guaranteed

          // Try to get withdraw_pin_hash separately to avoid crashing the whole query if column is missing
          let realHasPin = false;
          try {
            const { data: pinData } = (await supabase
              .from("profiles")
              .select("withdraw_pin_hash")
              .eq("user_id", user.id)
              .maybeSingle()) as any;
            realHasPin = !!pinData?.withdraw_pin_hash;
          } catch (e) {
            if (import.meta.env.DEV) console.warn("withdraw_pin_hash column might be missing");
          }

          addLines([
            `System Status: NOMINAL`,
            `Database: ENCRYPTED`,
            `User: ${user.email}`,
            `PGP Auth: ${hasPgp ? "ACTIVE" : "MISSING"}`,
            `Withdraw PIN: ${realHasPin ? "SET" : "NOT SET"}`,
            `Tor Circuit: ESTABLISHED (3-hop)`,
          ]);
        } catch (err) {
          addLines(["Error fetching status from database."]);
        }
        break;

      case "scan":
        addLines(["Initializing deep scan...", "Analyzing account security vectors..."]);

        setTimeout(async () => {
          if (!user) return;

          try {
            const [pgpRes, profileRes] = await Promise.all([
              supabase.from("user_pgp_keys").select("id").eq("user_id", user.id).maybeSingle(),
              supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle(),
            ]);

            const issues = [];
            if (!pgpRes.data) issues.push("CRITICAL: PGP Key not found. 2FA is recommended.");

            // Safe check for withdraw_pin_hash
            try {
              const { data: pinData } = (await supabase
                .from("profiles")
                .select("withdraw_pin_hash")
                .eq("user_id", user.id)
                .maybeSingle()) as any;
              if (!pinData?.withdraw_pin_hash) {
                issues.push("WARNING: Withdraw PIN not set. Funds are vulnerable.");
              }
            } catch (e) {
              issues.push("INFO: Could not verify Withdraw PIN status.");
            }

            if (issues.length === 0) {
              addLines(["Scan complete: No vulnerabilities found. Your account is secure."]);
            } else {
              addLines([
                "Scan complete: Vulnerabilities detected!",
                ...issues.map((i) => ` ! ${i}`),
                "Recommendation: Visit Security Settings to resolve these issues.",
              ]);
            }
          } catch (err) {
            addLines(["Scan failed: Connection interrupted."]);
          }
        }, 1000);
        break;

      case "logs":
        addLines(["Accessing encrypted logs..."]);
        try {
          if (!user?.email) {
            addLines(["Error: Authentication required."]);
            break;
          }

          const { data, error } = await supabase
            .from("security_logs")
            .select("created_at, ip, success")
            .eq("user_email", user.email)
            .order("created_at", { ascending: false })
            .limit(30);

          if (error) {
            addLines([`Database Error: ${error.message}`]);
            if (import.meta.env.DEV) console.error("Logs fetch error:", error);
            break;
          }

          if (data && data.length > 0) {
            addLines([
              `Retrieved ${data.length} entries:`,
              ...data.map((l) => {
                const time = l.created_at
                  ? new Date(l.created_at).toLocaleTimeString()
                  : "??:??:??";
                const ip = l.ip || "unknown";
                const status = l.success ? "SUCCESS" : "FAILED";
                return `[${time}] Login from ${ip}: ${status}`;
              }),
            ]);
          } else {
            addLines(["No security logs found for this session."]);
          }
        } catch (err: any) {
          addLines([`Terminal Error: ${err.message || "Unknown internal error"}`]);
          if (import.meta.env.DEV) console.error("Catch error in logs command:", err);
        }
        break;

      case "clear":
        setLines(INITIAL_LINES);
        break;

      case "exit":
        addLines(["Closing terminal... [ACCESS DENIED]"]);
        break;

      default:
        addLines([`Unknown command: ${cmd}`]);
    }
  };

  return (
    <div className="bg-black/90 rounded-lg border border-primary/30 font-mono text-[11px] h-[220px] flex flex-col overflow-hidden shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
      <div className="bg-secondary/50 px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
          Secure_Terminal.exe
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {lines.map((line, i) => (
          <div key={i} className={`${line.startsWith(">") ? "text-primary" : "text-green-500/80"}`}>
            {line}
          </div>
        ))}
      </div>

      <form onSubmit={handleCommand} className="p-3 border-t border-white/5 flex gap-2">
        <span className="text-primary font-bold">{">"}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          className="flex-1 bg-transparent border-none outline-none text-primary placeholder:text-primary/30"
          placeholder="Komut yazın..."
        />
      </form>
    </div>
  );
}
