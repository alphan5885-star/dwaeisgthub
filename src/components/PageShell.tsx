import { ReactNode, useEffect, useState } from "react";
import AppSidebar from "./AppSidebar";
import SessionTimerBadge from "./SessionTimerBadge";
import KizilyurekAssistant from "./KizilyurekAssistant";
import CommandPalette from "./CommandPalette";
import NewsTicker from "./NewsTicker";
import QuickTools from "./QuickTools";
import { useBackground } from "@/lib/backgroundContext";
import { useCustomization } from "@/lib/customizationContext";

export default function PageShell({ children }: { children: ReactNode }) {
  const { backgroundUrl, backgroundOpacity } = useBackground();
  const { settings } = useCustomization();
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    const handler = () => setAssistantOpen((v) => !v);
    window.addEventListener("kizilyurek:toggle", handler);
    return () => window.removeEventListener("kizilyurek:toggle", handler);
  }, []);

  const collapsed = settings.sidebarCollapsed;
  const isRight = settings.sidebarPosition === "right";
  const margin = collapsed ? (isRight ? "mr-16" : "ml-16") : isRight ? "mr-60" : "ml-60";
  const topPadding = "pt-8";

  return (
    <div className="min-h-screen bg-background relative">
      {backgroundUrl && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            opacity: backgroundOpacity,
          }}
        />
      )}
      <AppSidebar />
      <NewsTicker />
      <SessionTimerBadge />
      <main
        className={`${margin} ${topPadding} p-6 relative z-10 transition-[margin] duration-150`}
      >
        {children}
      </main>
      <KizilyurekAssistant
        position={isRight ? "bottom-right" : "bottom-left"}
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        hideFab
      />
      <QuickTools />
      <CommandPalette />
    </div>
  );
}
