"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpCircle,
  BarChart3,
  BadgeCheck,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings2,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { NotificationBell } from "@/components/notification-bell";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAdminLoginUrlPublic } from "@/lib/admin-login-public";
import { apiFetch } from "@/lib/api-client";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Users },
  { href: "/admin/stores", label: "Stores", icon: Store },
  { href: "/admin/upgrades", label: "Upgrades", icon: ArrowUpCircle },
  { href: "/admin/platform", label: "Platform", icon: Settings2 },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/ads", label: "Ads", icon: Megaphone },
] as const;

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const router = useRouter();

  async function logout() {
    await apiFetch("/api/admin/logout", { method: "POST" });
    router.push(getAdminLoginUrlPublic());
  }

  const sidebarBrand = (
    <div className="min-w-0">
      <BrandLogo href={null} size="sm" className="max-w-full" />
      <p className="truncate text-xs text-muted-foreground">Admin</p>
    </div>
  );

  return (
    <DashboardShell
      navItems={[...NAV]}
      sidebarBrand={sidebarBrand}
      mobileBrand={sidebarBrand}
      menuLabel="Menu"
      onLogout={logout}
      logoutLabel="Log out"
      headerActions={
        <>
          <NotificationBell forRole="admin" />
          <Link
            href="/"
            className="hidden text-sm font-medium text-brand-primary hover:underline sm:inline"
          >
            Storefront
          </Link>
          <span className="max-w-[10rem] truncate text-xs text-muted-foreground sm:text-sm">{email}</span>
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
