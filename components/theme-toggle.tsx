"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslations();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex size-8 shrink-0 rounded-lg border border-border bg-card md:size-9",
          className,
        )}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-in-out hover:border-brand-primary/30 hover:shadow-md active:scale-95 md:size-9 md:hover:scale-105 md:hover:shadow-xl",
        className,
      )}
      aria-label={t("theme.toggle")}
      title={t("theme.toggle")}
    >
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
