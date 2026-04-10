"use client";

import { useTranslations } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/types";
import { localeLabels, locales } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const flags: Record<Locale, string> = {
  so: "🇸🇴",
  en: "🇺🇸",
  ar: "🇸🇦",
};

const localeCodes: Record<Locale, string> = {
  so: "SO",
  en: "EN",
  ar: "AR",
};

export type LanguageSwitcherProps = {
  /** Distinct id when two selects exist (e.g. desktop header + mobile drawer). */
  selectId?: string;
  /** `compact` = narrow header strip; `menu` = full-width drawer row with full names. */
  variant?: "compact" | "menu";
  className?: string;
};

export function LanguageSwitcher({
  selectId = "laas24-locale",
  variant = "compact",
  className,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslations();
  const isMenu = variant === "menu";

  return (
    <div className={cn("flex items-center", isMenu ? "w-full" : "shrink-0", className)}>
      <label htmlFor={selectId} className="sr-only">
        Language — {localeLabels[locale]}
      </label>
      <select
        id={selectId}
        value={locale}
        title={localeLabels[locale]}
        aria-label={`Language: ${localeLabels[locale]}`}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={cn(
          "cursor-pointer rounded-lg border border-border bg-card font-semibold text-card-foreground shadow-sm transition hover:border-brand-primary/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
          isMenu
            ? "box-border w-full px-3 py-2.5 text-sm"
            : "w-[3.65rem] max-w-[3.65rem] py-1 pl-1 pr-5 text-[9px] sm:w-[4.5rem] sm:max-w-[4.5rem] sm:pl-1.5 sm:pr-6 sm:text-[10px] md:w-auto md:max-w-none md:py-1.5 md:pl-2 md:pr-7 md:text-sm",
        )}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {isMenu
              ? `${flags[code]} ${localeLabels[code]}`
              : `${flags[code]} ${localeCodes[code]} — ${localeLabels[code]}`}
          </option>
        ))}
      </select>
    </div>
  );
}
