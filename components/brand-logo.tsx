"use client";

import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeConfig: Record<
  Size,
  { box: string; cart: string; pkg: string; text: string }
> = {
  sm: { box: "h-7 w-7", cart: "h-3.5 w-3.5", pkg: "h-2.5 w-2.5", text: "text-base" },
  md: { box: "h-9 w-9", cart: "h-5 w-5", pkg: "h-3.5 w-3.5", text: "text-lg sm:text-xl md:text-2xl" },
  lg: { box: "h-11 w-11", cart: "h-6 w-6", pkg: "h-4 w-4", text: "text-2xl sm:text-3xl md:text-4xl" },
};

export type BrandLogoProps = {
  className?: string;
  size?: Size;
  /** `undefined` = link to `/`, `null` = no link (static mark) */
  href?: string | null;
  /** Set once per page (e.g. header) — avoid duplicate `id="logo"` in footer. */
  markId?: string;
};

/**
 * Wordmark: LAAS (green) + 24 (gold); cart + package icons use the same two-tone system.
 */
export function BrandLogo({ className, size = "md", href, markId }: BrandLogoProps) {
  const s = sizeConfig[size];

  const mark = (
    <span
      id={markId}
      className={cn("inline-flex min-w-0 max-w-full items-center gap-2 sm:gap-2.5", className)}
      translate="no"
      lang="en"
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl border border-border/70 bg-gradient-to-br from-primary/12 to-secondary/12 shadow-sm dark:border-border/50 dark:from-primary/18 dark:to-secondary/18",
          s.box,
        )}
        aria-hidden
      >
        <ShoppingCart className={cn(s.cart, "text-primary")} strokeWidth={2.25} />
        <Package className={cn("absolute -bottom-0.5 -right-0.5 text-secondary", s.pkg)} strokeWidth={2.5} />
      </span>
      <span className={cn("min-w-0 truncate font-extrabold tracking-tight leading-none", s.text)}>
        <span className="text-primary font-bold">LAAS</span>
        <span className="text-secondary font-bold">24</span>
      </span>
    </span>
  );

  if (href === null) {
    return mark;
  }

  const to = href ?? "/";
  return (
    <Link
      href={to}
      className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 md:shrink-0"
    >
      {mark}
    </Link>
  );
}
