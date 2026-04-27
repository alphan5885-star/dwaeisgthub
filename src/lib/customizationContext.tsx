import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CustomizationSettings {
  // Theme color (HSL hue)
  themeHue: number;
  // Font
  fontFamily: "inter" | "jetbrains" | "system";
  fontSize: "small" | "normal" | "large";
  // Animations
  neonEnabled: boolean;
  animationsEnabled: boolean;
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarPosition: "left" | "right";
  // Currency
  preferredCurrency: "LTC" | "USD" | "XMR";
}

const defaults: CustomizationSettings = {
  themeHue: 349,
  fontFamily: "inter",
  fontSize: "normal",
  neonEnabled: true,
  animationsEnabled: true,
  sidebarCollapsed: false,
  sidebarPosition: "left",
  preferredCurrency: "LTC",
};

interface CustomizationContextType {
  settings: CustomizationSettings;
  updateSettings: (partial: Partial<CustomizationSettings>) => void;
  resetSettings: () => void;
}

const CustomizationContext = createContext<CustomizationContextType>({
  settings: defaults,
  updateSettings: () => {},
  resetSettings: () => {},
});

export const useCustomization = () => useContext(CustomizationContext);

const STORAGE_KEY = "app_customization";

const fontMap = {
  inter: "'Inter', sans-serif",
  jetbrains: "'JetBrains Mono', monospace",
  system: "system-ui, -apple-system, sans-serif",
};

const fontSizeMap = {
  small: "14px",
  normal: "16px",
  large: "18px",
};

function applySettings(s: CustomizationSettings) {
  const root = document.documentElement;

  // Theme color
  root.style.setProperty("--primary", `${s.themeHue} 100% 50%`);
  root.style.setProperty("--accent", `${s.themeHue} 100% 50%`);
  root.style.setProperty("--ring", `${s.themeHue} 100% 50%`);
  root.style.setProperty("--sidebar-primary", `${s.themeHue} 100% 50%`);
  root.style.setProperty("--sidebar-ring", `${s.themeHue} 100% 50%`);

  // Update neon glow CSS vars
  root.style.setProperty("--neon-glow", `0 0px 20px hsl(${s.themeHue} 100% 50% / 0.4)`);
  root.style.setProperty("--neon-glow-strong", `0 0px 40px hsl(${s.themeHue} 100% 50% / 0.6)`);

  // Font
  root.style.setProperty("--app-font", fontMap[s.fontFamily]);
  document.body.style.fontFamily = fontMap[s.fontFamily];
  document.body.style.fontSize = fontSizeMap[s.fontSize];

  // Neon / animations
  if (!s.neonEnabled) {
    root.classList.add("no-neon");
  } else {
    root.classList.remove("no-neon");
  }
  if (!s.animationsEnabled) {
    root.classList.add("no-animations");
  } else {
    root.classList.remove("no-animations");
  }
}

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CustomizationSettings>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (partial: Partial<CustomizationSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetSettings = () => {
    setSettings(defaults);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CustomizationContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </CustomizationContext.Provider>
  );
}
