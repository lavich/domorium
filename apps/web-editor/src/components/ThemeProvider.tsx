import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { WebTheme } from "@/editor/types";

interface ThemeContextValue {
  resolvedTheme: WebTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The theme script in the page's head owns the choice for the whole domain: it
 * runs before the first paint and the header's button is its. This follows the
 * class it sets, so a surface that has to be told its colours can be.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<WebTheme>(readRoot);

  useEffect(() => {
    const read = () => setResolvedTheme(readRoot());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const value = useMemo(() => ({ resolvedTheme }), [resolvedTheme]);

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

function readRoot(): WebTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
