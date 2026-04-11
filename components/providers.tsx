"use client";

import type { ReactNode } from "react";
import { ClientTopLoader } from "@/components/client-top-loader";
import { AppToaster } from "@/components/app-toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { CustomerAds } from "@/components/customer-ads";
import { FloatingWhatsAppSupport } from "@/components/floating-whatsapp-support";
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
          <ClientTopLoader />
          <CustomerProvider>
            {children}
            <AppToaster />
            <PwaInstallPrompt />
            <MobileBottomNav />
            <FloatingWhatsAppSupport />
            <CustomerAds />
          </CustomerProvider>
        </ThemeProvider>
      </CartProvider>
    </LocaleProvider>
  );
}
