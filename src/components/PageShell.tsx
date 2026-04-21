import { ReactNode, useEffect, useState } from "react";
import AppSidebar from "./AppSidebar";
import SessionTimerBadge from "./SessionTimerBadge";
import KizilyurekAssistant from "./KizilyurekAssistant";
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
  const margin = collapsed ? (isRight ? "mr-16" : "ml-16") : (isRight ? "mr-56" : "ml-56");

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
      <SessionTimerBadge />
      <main className={`${margin} p-6 relative z-10 transition-all duration-300`}>{children}</main>
      <KizilyurekAssistant
        position={isRight ? "bottom-right" : "bottom-left"}
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        hideFab
      />
    </div>
  );
}
