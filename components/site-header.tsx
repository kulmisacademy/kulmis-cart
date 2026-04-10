"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart, User } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCart } from "@/lib/cart-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { authUrl } from "@/lib/auth-routes";
import { useTranslations } from "@/lib/locale-context";
import { useOptionalStoreInventorySearch } from "@/components/store-inventory-search-context";

const navKeys = [
  { href: "/", key: "nav.home" as const },
  { href: "/products", key: "nav.products" as const },
  { href: "/stores", key: "nav.stores" as const },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { totalItems, isReady } = useCart();
  const { customer } = useCustomerAuth();

  const accountHref =
    customer != null ? "/account" : authUrl({ tab: "customer", next: pathname || "/" });
  const isStoreDetail = /^\/(?:stores|store)\/[^/]+$/.test(pathname);
  const showSearch =
    pathname === "/products" || pathname.startsWith("/stores") || pathname.startsWith("/store/");
  const isLoginOrRegister =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/auth" ||
    pathname.startsWith("/customer/login") ||
    pathname.startsWith("/customer/register");
  const searchPlaceholder = isStoreDetail ? t("nav.searchPlaceholderStore") : t("nav.searchPlaceholder");
  const storeInventorySearch = useOptionalStoreInventorySearch();
  const headerInventorySearchProps =
    storeInventorySearch != null
      ? {
          value: storeInventorySearch.search,
          onChange: (e: ChangeEvent<HTMLInputElement>) => storeInventorySearch.setSearch(e.target.value),
        }
      : {};

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur transition-colors dark:bg-slate-950/95">
      <div className="mx-auto w-full max-w-brand px-3 sm:px-6">
        {/* One bar: logo gets flexible space + truncation; controls never shrink into it */}
        <div className="flex items-center gap-1.5 py-2 sm:gap-2 sm:py-3 md:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden sm:gap-2 md:flex-none md:overflow-visible">
            <BrandLogo markId="logo" href="/" size="md" className="min-w-0 max-md:max-w-[min(100%,11rem)]" />
            <Link
              href={authUrl({ tab: "store", mode: "register" })}
              className="hidden shrink-0 whitespace-nowrap rounded-md px-1.5 py-1 text-[10px] font-bold text-brand-primary underline-offset-2 hover:underline sm:inline-flex sm:px-2 sm:text-[11px] md:hidden"
            >
              {t("nav.openStore")}
            </Link>
          </div>

          <nav
            className="hidden min-w-0 flex-1 justify-center px-1 md:flex"
            aria-label="Primary"
          >
            {isStoreDetail ? (
              <Link
                href="#inventory"
                className="border-b-2 border-brand-primary pb-1 text-sm font-semibold text-foreground transition hover:text-brand-primary"
              >
                {t("nav.categories")}
              </Link>
            ) : (
              <div className="flex items-center gap-4 text-sm font-medium lg:gap-8">
                {navKeys.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition-all duration-300 ease-in-out ${
                      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                        ? "border-b-2 border-brand-primary pb-1 text-foreground"
                        : "text-muted-foreground hover:text-brand-primary"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3">
            {showSearch ? (
              <div className="hidden min-w-0 max-w-[min(100%,280px)] flex-1 items-center rounded-xl border border-border bg-muted px-3 py-2 lg:flex">
                <Search size={16} className="mr-2 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  suppressHydrationWarning
                  type="search"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  {...headerInventorySearchProps}
                />
              </div>
            ) : null}

            {isLoginOrRegister ? (
              <Link
                href={authUrl({ tab: "store", mode: "register" })}
                className="hidden rounded-md bg-brand-accent px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 md:inline-flex lg:px-3"
              >
                {t("nav.openStore")}
              </Link>
            ) : null}

            <LanguageSwitcher selectId="laas24-locale" variant="compact" />
            <ThemeToggle />

            {customer != null ? <NotificationBell forRole="customer" /> : null}

            <Link
              href="/cart"
              className="relative inline-flex size-9 min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-brand-primary md:size-10 md:min-h-10 md:min-w-10"
              aria-label={totalItems > 0 ? `${t("nav.cart")}, ${totalItems}` : t("nav.cart")}
            >
              <ShoppingCart className="size-[1.1rem] md:size-[1.15rem]" aria-hidden />
              {isReady && totalItems > 0 ? (
                <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-accent px-0.5 text-[8px] font-bold text-white md:h-4 md:min-w-4 md:text-[10px]">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              ) : null}
            </Link>
            <Link
              href={accountHref}
              className="inline-flex size-9 min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-brand-primary md:size-10 md:min-h-10 md:min-w-10"
              aria-label={customer != null ? "My account" : t("nav.account")}
            >
              <User className="size-[1.1rem] md:size-[1.15rem]" aria-hidden />
            </Link>
          </div>
        </div>

        {showSearch ? (
          <div className="border-t border-border py-2 lg:hidden" role="search">
            <div className="flex items-center rounded-xl border border-border bg-muted px-3 py-2">
              <Search size={16} className="mr-2 shrink-0 text-muted-foreground" aria-hidden />
              <input
                suppressHydrationWarning
                type="search"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                {...headerInventorySearchProps}
              />
            </div>
            {isStoreDetail ? (
              <Link
                href="#inventory"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand-primary/10 py-2 text-xs font-semibold text-brand-primary"
              >
                {t("nav.categories")}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
