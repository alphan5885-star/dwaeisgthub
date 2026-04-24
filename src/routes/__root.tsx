import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { BackgroundProvider } from "@/lib/backgroundContext";
import { CustomizationProvider } from "@/lib/customizationContext";
import { I18nProvider } from "@/lib/i18n";
import { SessionTimerProvider } from "@/lib/sessionTimerContext";
import BackgroundMusic from "@/components/BackgroundMusic";

import NotFound from "@/pages/NotFound";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "aeigsthub" },
      { name: "description", content: "aeigsthub — yeraltı pazarı operasyon paneli" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { name: "referrer", content: "no-referrer" },
      { httpEquiv: "Content-Security-Policy", content: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      { httpEquiv: "X-Frame-Options", content: "DENY" },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { httpEquiv: "Permissions-Policy", content: "geolocation=(), camera=(), microphone=(), interest-cohort=()" },
      { property: "og:title", content: "aeigsthub" },
      { name: "twitter:title", content: "aeigsthub" },
      { property: "og:description", content: "aeigsthub — yeraltı pazarı operasyon paneli" },
      { name: "twitter:description", content: "aeigsthub — yeraltı pazarı operasyon paneli" },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse">Yükleniyor...</div>
      </div>
    );
  }
  if (user && !role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card neon-border rounded-lg p-6 w-full max-w-md text-center space-y-4">
          <div>
            <h1 className="text-2xl font-mono font-bold text-primary neon-text">aeigsthub</h1>
            <p className="text-xs font-mono text-muted-foreground mt-2">Hesap yetkisi yüklenemedi.</p>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full bg-primary text-primary-foreground py-3 rounded font-mono text-sm font-bold hover:opacity-90 transition-all"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <AuthProvider>
          <SessionTimerProvider>
            <I18nProvider>
              <CustomizationProvider>
                <BackgroundProvider>
                  <AuthGuard>
                    <Outlet />
                  </AuthGuard>
                  <BackgroundMusic />
                </BackgroundProvider>
              </CustomizationProvider>
            </I18nProvider>
          </SessionTimerProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
