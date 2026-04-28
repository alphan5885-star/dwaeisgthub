import { useEffect, useState } from "react";
import { Bot, Command, Copy, EyeOff, Moon, PanelLeftClose, PanelLeftOpen, Shield } from "lucide-react";
import { useLocation } from "@/lib/router-shim";
import { useCustomization } from "@/lib/customizationContext";
import { useStealth } from "@/lib/stealthContext";

const dispatch = (name: string) => window.dispatchEvent(new CustomEvent(name));

export default function QuickTools() {
  const location = useLocation();
  const { settings, updateSettings } = useCustomization();
  const { toggleStealth } = useStealth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "q") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const copySnapshot = async () => {
    const payload = [`route=${location.pathname}`, `time=${new Date().toISOString()}`].join("\n");
    await navigator.clipboard?.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const tools = [
    {
      label: "Komut paleti",
      icon: Command,
      action: () => dispatch("palette:toggle"),
    },
    {
      label: "AI asistan",
      icon: Bot,
      action: () => dispatch("kizilyurek:toggle"),
    },
    {
      label: settings.sidebarCollapsed ? "Menüyü aç" : "Menüyü daralt",
      icon: settings.sidebarCollapsed ? PanelLeftOpen : PanelLeftClose,
      action: () => updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed }),
    },
    {
      label: settings.neonEnabled ? "Neonu kapat" : "Neonu aç",
      icon: Moon,
      action: () => updateSettings({ neonEnabled: !settings.neonEnabled }),
    },
    {
      label: "Stealth modu",
      icon: EyeOff,
      action: toggleStealth,
    },
    {
      label: copied ? "Kopyalandı" : "Durumu kopyala",
      icon: copied ? Shield : Copy,
      action: copySnapshot,
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="glass-card neon-border rounded-lg p-2 grid grid-cols-3 gap-1">
          {tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              title={tool.label}
              onClick={tool.action}
              className="w-10 h-10 rounded-md border border-border bg-secondary/70 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center"
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        title="Hızlı araçlar"
        onClick={() => setOpen((value) => !value)}
        className="w-11 h-11 rounded-full border border-primary/40 bg-card text-primary neon-border hover:scale-105 transition-transform flex items-center justify-center"
      >
        <Command className="w-5 h-5" />
      </button>
    </div>
  );
}