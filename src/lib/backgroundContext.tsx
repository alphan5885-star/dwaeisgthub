import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BackgroundContextType {
  backgroundUrl: string | null;
  setBackgroundUrl: (url: string | null) => void;
  backgroundOpacity: number;
  setBackgroundOpacity: (v: number) => void;
}

const BackgroundContext = createContext<BackgroundContextType>({
  backgroundUrl: null,
  setBackgroundUrl: () => {},
  backgroundOpacity: 0.15,
  setBackgroundOpacity: () => {},
});

export const useBackground = () => useContext(BackgroundContext);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [backgroundUrl, setBackgroundUrlState] = useState<string | null>(
    () => localStorage.getItem("app_bg_url")
  );
  const [backgroundOpacity, setBackgroundOpacityState] = useState<number>(
    () => parseFloat(localStorage.getItem("app_bg_opacity") || "0.15")
  );

  const setBackgroundUrl = (url: string | null) => {
    setBackgroundUrlState(url);
    if (url) localStorage.setItem("app_bg_url", url);
    else localStorage.removeItem("app_bg_url");
  };

  const setBackgroundOpacity = (v: number) => {
    setBackgroundOpacityState(v);
    localStorage.setItem("app_bg_opacity", String(v));
  };

  return (
    <BackgroundContext.Provider value={{ backgroundUrl, setBackgroundUrl, backgroundOpacity, setBackgroundOpacity }}>
      {children}
    </BackgroundContext.Provider>
  );
}
