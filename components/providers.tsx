"use client";

import type { ReactNode } from "react";
import NextTopLoader from "nextjs-toploader";
import { AppToaster } from "@/components/app-toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { CustomerAds } from "@/components/customer-ads";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { CartProvider } from "@/lib/cart-context";
import { CustomerProvider } from "@/lib/customer-auth-context";
import { LocaleProvider } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/types";

export function Providers({
  children,
  initialLocale = "so",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <CartProvider>
        <ThemeProvider>
          <NextTopLoader
            color="#22c55e"
            height={3}
            showSpinner={false}
            crawlSpeed={200}
            shadow="0 0 12px rgba(34, 197, 94, 0.45)"
            zIndex={99999}
          />
          <CustomerProvider>
            {children}
            <AppToaster />
            <PwaInstallPrompt />
            <MobileBottomNav />
            <CustomerAds />
          </CustomerProvider>
        </ThemeProvider>
      </CartProvider>
    </LocaleProvider>
  );
}
