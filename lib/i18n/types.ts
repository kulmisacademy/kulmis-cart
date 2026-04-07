export type Locale = "so" | "en" | "ar";

/** Same value for `document.cookie` and `localStorage` — must match server `cookies()` read in layout. */
export const LOCALE_COOKIE_NAME = "kulmiscart-locale";

export const locales: Locale[] = ["so", "en", "ar"];

export const localeLabels: Record<Locale, string> = {
  so: "Soomaali",
  en: "English",
  ar: "العربية",
};

/** Server layout + cookie parsing — keeps SSR locale aligned with `LocaleProvider` initial state. */
export function parseLocaleCookie(value: string | undefined): Locale {
  if (value === "en" || value === "ar" || value === "so") return value;
  return "so";
}
