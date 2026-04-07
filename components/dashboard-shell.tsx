"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DashboardNavLinks } from "@/components/dashboard-nav-links";
import { Button } from "@/components/ui/button";

export type DashboardShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type DashboardShellProps = {
  children: React.ReactNode;
  navItems: DashboardShellNavItem[];
  /** Left sidebar top (e.g. logo + titles) */
  sidebarBrand: React.ReactNode;
  /** Shown under menu on mobile header row */
  mobileBrand?: React.ReactNode;
  /** Trailing header area (language, notifications, etc.) */
  headerActions?: React.ReactNode;
  menuLabel: string;
  onLogout: () => void | Promise<void>;
  logoutLabel: string;
  /** Optional profile dropdown trigger label */
  profileLabel?: string;
  profileLinks?: { href: string; label: string }[];
};

export function DashboardShell({
  children,
  navItems,
  sidebarBrand,
  mobileBrand,
  headerActions,
  menuLabel,
  onLogout,
  logoutLabel,
  profileLabel,
  profileLinks,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card shadow-sm lg:flex lg:flex-col dark:bg-slate-950">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">{sidebarBrand}</div>
        <DashboardNavLinks
          navItems={navItems}
          pathname={pathname}
          onLogout={onLogout}
          logoutLabel={logoutLabel}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(100%,18rem)] flex-col bg-card shadow-xl dark:bg-slate-950">
            <div className="flex h-14 items-center justify-between border-b border-border px-3">
              <span className="text-sm font-semibold">{menuLabel}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DashboardNavLinks
                navItems={navItems}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                onLogout={onLogout}
                logoutLabel={logoutLabel}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:h-16 sm:px-4 dark:bg-slate-950/95">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={menuLabel}
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {mobileBrand ? <div className="min-w-0 lg:hidden">{mobileBrand}</div> : null}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {headerActions}
            {profileLabel ? (
              <div className="relative" ref={profileRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-xl border-border px-2 sm:px-3"
                  onClick={() => setProfileOpen((o) => !o)}
                >
                  <span className="hidden max-w-[8rem] truncate sm:inline">{profileLabel}</span>
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
                {profileOpen && profileLinks?.length ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg ring-1 ring-border/60 dark:bg-slate-950">
                    {profileLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="block px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => setProfileOpen(false)}
                      >
                        {l.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setProfileOpen(false);
                        void onLogout();
                      }}
                    >
                      {logoutLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
