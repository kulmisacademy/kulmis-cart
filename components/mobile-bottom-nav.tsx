"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ClipboardList, Home, MessageCircle, ShoppingBag, User } from "lucide-react";
import { authUrl } from "@/lib/auth-routes";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { useTranslations } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

function useHash(): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return hash;
}

function showStorefrontBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/vendor")) return false;
  if (pathname.startsWith("/admin")) return false;
  return true;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const hash = useHash();
  const { t } = useTranslations();
  const { customer } = useCustomerAuth();

  if (!showStorefrontBottomNav(pathname)) return null;

  const loginNext = pathname && pathname !== "/auth" ? pathname : "/account";
  const accountHref =
    customer != null ? "/account" : authUrl({ tab: "customer", next: loginNext });
  const messagesHref =
    customer != null ? "/account#messages" : authUrl({ tab: "customer", next: "/account#messages" });
  const ordersHref =
    customer != null ? "/account#orders" : authUrl({ tab: "customer", next: "/account#orders" });

  const onAccount = pathname === "/account";
  const messagesActive = onAccount && hash === "#messages";
  const ordersActive = onAccount && hash === "#orders";
  const accountTabActive = onAccount && hash !== "#messages" && hash !== "#orders";

  const tabClass = (active: boolean) =>
    cn(
      "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold leading-tight transition-colors active:bg-muted/80",
      active ? "text-brand-primary" : "text-muted-foreground",
    );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur supports-[backdrop-filter]:bg-background/85 dark:bg-slate-950/95 dark:shadow-black/40 md:hidden"
        aria-label="Bottom navigation"
      >
        <div className="mx-auto flex max-w-brand justify-around gap-0.5 px-1">
          <Link href="/" className={tabClass(pathname === "/")} aria-current={pathname === "/" ? "page" : undefined}>
            <Home className="size-5 shrink-0" aria-hidden />
            <span className="max-w-[4.5rem] truncate text-center">{t("nav.home")}</span>
          </Link>
          <Link
            href="/products"
            className={tabClass(pathname === "/products" || pathname.startsWith("/products/"))}
            aria-current={pathname.startsWith("/products") ? "page" : undefined}
          >
            <ShoppingBag className="size-5 shrink-0" aria-hidden />
            <span className="max-w-[4.5rem] truncate text-center">{t("nav.products")}</span>
          </Link>
          <Link
            href={messagesHref}
            className={tabClass(messagesActive)}
            aria-current={messagesActive ? "page" : undefined}
          >
            <MessageCircle className="size-5 shrink-0" aria-hidden />
            <span className="max-w-[4.5rem] truncate text-center">{t("nav.messages")}</span>
          </Link>
          <Link
            href={ordersHref}
            className={tabClass(ordersActive)}
            aria-current={ordersActive ? "page" : undefined}
          >
            <ClipboardList className="size-5 shrink-0" aria-hidden />
            <span className="max-w-[4.5rem] truncate text-center">{t("nav.orders")}</span>
          </Link>
          <Link
            href={accountHref}
            className={tabClass(accountTabActive)}
            aria-current={accountTabActive ? "page" : undefined}
          >
            <User className="size-5 shrink-0" aria-hidden />
            <span className="max-w-[4.5rem] truncate text-center">{t("nav.account")}</span>
          </Link>
        </div>
      </nav>
      <div
        className="h-[calc(3.5rem+max(0.5rem,env(safe-area-inset-bottom)))] shrink-0 md:hidden"
        aria-hidden
      />
    </>
  );
}
