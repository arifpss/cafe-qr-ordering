import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";

export type ThemeName = "cyberpunk" | "windows11" | "apple";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const applyTheme = (theme: ThemeName) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>("cyberpunk");

  const refreshTheme = async () => {
    try {
      const data = await apiFetch<{ theme: ThemeName }>("/api/settings/theme");
      setThemeState(data.theme);
      applyTheme(data.theme);
    } catch (error) {
      console.warn("Failed to load theme", error);
    }
  };

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
    applyTheme(next);
  };

  useEffect(() => {
    applyTheme(theme);
    refreshTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ theme, setTheme, refreshTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
