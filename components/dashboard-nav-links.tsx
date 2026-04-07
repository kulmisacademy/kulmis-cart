"use client";

import Link from "next/link";
import { LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardNavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type Props = {
  navItems: DashboardNavLinkItem[];
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void | Promise<void>;
  logoutLabel: string;
};

/** Sidebar / drawer navigation — module-level component (stable identity). */
export function DashboardNavLinks({ navItems, pathname, onNavigate, onLogout, logoutLabel }: Props) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const segments = href.split("/").filter(Boolean);
        const isSectionRoot = segments.length <= 1;
        const active = isSectionRoot
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-primary/12 text-brand-primary shadow-sm ring-1 ring-brand-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-[1.125rem] shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          void onLogout();
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="size-[1.125rem] shrink-0" aria-hidden />
        {logoutLabel}
      </button>
    </nav>
  );
}
