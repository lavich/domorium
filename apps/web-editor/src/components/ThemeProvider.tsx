import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { WebTheme } from "@/editor/types";

export type ThemeChoice = WebTheme | "system";

interface ThemeContextValue {
  theme: ThemeChoice;
  resolvedTheme: WebTheme;
  setTheme(theme: ThemeChoice): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "domorium-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(readStoredTheme);
  const [systemTheme, setSystemTheme] = useState<WebTheme>(readSystemTheme);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((value: ThemeChoice) => {
    localStorage.setItem(storageKey, value);
    setThemeState(value);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
}

function readStoredTheme(): ThemeChoice {
  const value = localStorage.getItem(storageKey);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function readSystemTheme(): WebTheme {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}
