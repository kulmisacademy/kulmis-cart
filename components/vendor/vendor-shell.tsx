"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Package,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { DashboardShell } from "@/components/dashboard-shell";
import { useTranslations } from "@/lib/locale-context";
import { useVendorDashboard } from "./vendor-dashboard-provider";

const NAV_KEYS = [
  { href: "/vendor", key: "overview", icon: LayoutDashboard },
  { href: "/vendor/products", key: "products", icon: Package },
  { href: "/vendor/orders", key: "orders", icon: ShoppingCart },
  { href: "/vendor/messages", key: "messages", icon: MessageCircle },
  { href: "/vendor/analytics", key: "analytics", icon: BarChart3 },
  { href: "/vendor/settings", key: "settings", icon: Settings },
  { href: "/vendor/subscription", key: "subscription", icon: CreditCard },
] as const;

export function VendorShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslations();
  const router = useRouter();
  const { state, vendor } = useVendorDashboard();

  const logoSrc =
    state.settings.logoDataBase64 && state.settings.logoMime
      ? `data:${state.settings.logoMime};base64,${state.settings.logoDataBase64}`
      : null;

  const initials = state.settings.storeName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await fetch("/api/vendor/logout", { method: "POST" });
    router.push("/");
  }

  const avatar = (
    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-primary/10 text-sm font-bold text-brand-primary">
      {logoSrc ? (
        <Image src={logoSrc} alt="" width={36} height={36} className="size-9 object-cover" unoptimized />
      ) : (
        initials
      )}
    </div>
  );

  const sidebarBrand = (
    <div className="flex min-w-0 items-center gap-2">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{state.settings.storeName}</p>
        <p className="truncate text-xs text-muted-foreground">{t("vendor.badge")}</p>
      </div>
    </div>
  );

  const mobileBrand = (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-primary/10 text-xs font-bold text-brand-primary lg:hidden">
        {logoSrc ? (
          <Image src={logoSrc} alt="" width={36} height={36} className="size-9 object-cover" unoptimized />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{state.settings.storeName}</p>
        <p className="truncate text-xs text-muted-foreground">{vendor.storeSlug}</p>
      </div>
    </div>
  );

  return (
    <DashboardShell
      navItems={NAV_KEYS.map(({ href, key, icon }) => ({
        href,
        label: t(`vendor.nav.${key}`),
        icon,
      }))}
      sidebarBrand={sidebarBrand}
      mobileBrand={mobileBrand}
      menuLabel={t("vendor.menu")}
      onLogout={logout}
      logoutLabel={t("vendor.nav.logout")}
      profileLabel={state.settings.storeName}
      profileLinks={[{ href: "/vendor/settings", label: t("vendor.nav.settings") }]}
      headerActions={
        <>
          <NotificationBell forRole="vendor" />
          <LanguageSwitcher />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
