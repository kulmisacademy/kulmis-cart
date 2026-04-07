"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-constants";
import { buildThemeCookieValue } from "@/lib/theme-cookie";

type ThemeMode = "light" | "dark" | "system";

export type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (value: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => void;
  resolvedTheme: "light" | "dark";
  systemTheme: "light" | "dark";
  themes: string[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode, system: "light" | "dark"): "light" | "dark" {
  if (mode === "dark" || mode === "light") return mode;
  return system;
}

function applyDom(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  /** Avoid stripping SSR `dark` on <html> before localStorage is read. */
  const [themeHydrated, setThemeHydrated] = useState(false);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "light" : getSystemTheme(),
  );

  const resolvedTheme = useMemo(
    () => resolveTheme(theme, systemTheme),
    [theme, systemTheme],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemTheme(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        const next: ThemeMode =
          raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
        setThemeState(next);
        document.cookie = buildThemeCookieValue(next);
      } catch {
        /* private mode */
      }
      setThemeHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!themeHydrated) return;
    applyDom(resolvedTheme);
  }, [resolvedTheme, themeHydrated]);

  const setTheme = useCallback((value: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => {
    setThemeState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
        document.cookie = buildThemeCookieValue(next);
      } catch {
        /* quota / private mode */
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: ["light", "dark"],
    }),
    [theme, setTheme, resolvedTheme, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
