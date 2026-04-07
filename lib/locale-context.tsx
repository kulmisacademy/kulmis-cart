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
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { LOCALE_COOKIE_NAME, locales } from "@/lib/i18n/types";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setLocaleCookieClient(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

function getNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p]!;
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Used when a client subtree renders before/houtside LocaleProvider (e.g. some Next.js 16 / Turbopack boundaries). */
const FALLBACK_LOCALE: Locale = "so";
const fallbackLocaleValue: LocaleContextValue = {
  locale: FALLBACK_LOCALE,
  setLocale: () => {
    /* no-op when provider is missing */
  },
  t: (key: string) => getNested(dictionaries[FALLBACK_LOCALE] as unknown as Record<string, unknown>, key),
};

function isLocale(value: string | null): value is Locale {
  return value !== null && locales.includes(value as Locale);
}

export function LocaleProvider({
  children,
  initialLocale = "so",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_COOKIE_NAME);
    const id = window.setTimeout(() => {
      if (isLocale(saved)) {
        setLocaleState(saved);
        setLocaleCookieClient(saved);
      }
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LOCALE_COOKIE_NAME, locale);
    setLocaleCookieClient(locale);
    document.documentElement.lang = locale === "so" ? "so" : locale === "ar" ? "ar" : "en";
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale, mounted]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocaleCookieClient(next);
  }, []);

  const dict = dictionaries[locale];

  const t = useCallback(
    (key: string) => getNested(dict as unknown as Record<string, unknown>, key),
    [dict],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.warn(
      "[kulmiscart] LocaleProvider missing — using fallback locale. Wrap the app with LocaleProvider (see components/providers.tsx).",
    );
  }
  return fallbackLocaleValue;
}

/** i18n: `const { t, locale, setLocale } = useTranslations()` */
export function useTranslations(): LocaleContextValue {
  return useLocaleContext();
}
