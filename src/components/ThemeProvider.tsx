"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("tenko-theme") as Theme) || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("tenko-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
