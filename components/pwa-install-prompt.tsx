"use client";

import { Download, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

const DISMISS_STORAGE_KEY = "kulmiscart-pwa-install-dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    nav.standalone === true
  );
}

function isSecureEnoughForPwa(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function showStorefrontPwaPrompt(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/vendor")) return false;
  if (pathname.startsWith("/admin")) return false;
  return true;
}

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const at = parseInt(raw, 10);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!showStorefrontPwaPrompt(pathname) || !isSecureEnoughForPwa()) return;
    if (isStandalonePwa() || dismissedRecently()) return;

    setShowBar(true);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [mounted, pathname]);

  const onDismissBar = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShowBar(false);
    setHelpOpen(false);
  }, []);

  const onPrimary = useCallback(async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {
        /* user dismissed native UI */
      }
      setDeferred(null);
      return;
    }
    setHelpOpen(true);
  }, [deferred]);

  if (!mounted || !showBar) return null;

  return (
    <>
      <div
        className={cn(
          "fixed z-[55] flex flex-col gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm dark:bg-slate-950/95",
          "left-3 right-3 max-md:bottom-[max(5.25rem,calc(env(safe-area-inset-bottom,0px)+4.75rem))] md:bottom-8 md:left-auto md:right-8 md:max-w-sm",
        )}
        role="region"
        aria-label={t("pwa.install")}
      >
        <div className="flex items-start gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Download className="size-[1.1rem]" aria-hidden />
          </div>
          <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">{t("pwa.tagline")}</p>
          <button
            type="button"
            onClick={onDismissBar}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={t("pwa.dismiss")}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="rounded-xl font-semibold" onClick={() => void onPrimary()}>
            {deferred ? t("pwa.install") : t("pwa.howToInstall")}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={onDismissBar}>
            {t("pwa.dismiss")}
          </Button>
        </div>
      </div>

      {helpOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="pwa-help-title"
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl dark:bg-slate-950">
            <h2 id="pwa-help-title" className="text-lg font-semibold text-foreground">
              {t("pwa.howToInstall")}
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Desktop — </span>
                {t("pwa.desktopHint")}
              </li>
              <li>
                <span className="font-medium text-foreground">iOS — </span>
                {t("pwa.iosHint")}
              </li>
              <li>
                <span className="font-medium text-foreground">Android — </span>
                {t("pwa.androidHint")}
              </li>
            </ul>
            <Button type="button" className="mt-6 w-full rounded-xl font-semibold" onClick={() => setHelpOpen(false)}>
              {t("pwa.gotIt")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
