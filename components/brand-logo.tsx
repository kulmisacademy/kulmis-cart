"use client";

import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

/** Official name — same in every locale (not translated via i18n or browser). */
const PLATFORM_MARK = "KULMISCART";

type Size = "sm" | "md" | "lg";

const sizeConfig: Record<
  Size,
  { box: string; cart: string; pkg: string; text: string }
> = {
  sm: { box: "h-7 w-7", cart: "h-3.5 w-3.5", pkg: "h-2.5 w-2.5", text: "text-base" },
  md: { box: "h-9 w-9", cart: "h-5 w-5", pkg: "h-3.5 w-3.5", text: "text-lg sm:text-xl md:text-2xl" },
  lg: { box: "h-11 w-11", cart: "h-6 w-6", pkg: "h-4 w-4", text: "text-2xl sm:text-3xl" },
};

export type BrandLogoProps = {
  className?: string;
  size?: Size;
  /** `undefined` = link to `/`, `null` = no link (static mark) */
  href?: string | null;
};

/**
 * Wordmark: cart + package icons (left), two-tone “KULMIS” + “CART” — uses `globals.css` theme tokens.
 */
export function BrandLogo({ className, size = "md", href }: BrandLogoProps) {
  const brand = PLATFORM_MARK;
  const s = sizeConfig[size];
  const lower = brand.toLowerCase();
  const words = brand.trim().split(/\s+/).filter(Boolean);
  const splitSpace = words.length >= 2 ? { first: words[0]!, second: words.slice(1).join(" ") } : null;
  const splitKulmis =
    !splitSpace &&
    lower.length >= 9 &&
    lower.startsWith("kulmis") &&
    lower.endsWith("cart") &&
    lower.lastIndexOf("cart") > 0;
  const first = splitSpace
    ? splitSpace.first
    : splitKulmis
      ? brand.slice(0, lower.lastIndexOf("cart"))
      : brand;
  const second = splitSpace ? splitSpace.second : splitKulmis ? brand.slice(lower.lastIndexOf("cart")) : "";

  const mark = (
    <span
      className={cn("inline-flex min-w-0 max-w-full items-center gap-2 sm:gap-2.5", className)}
      translate="no"
      lang="en"
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl border border-border/70 bg-gradient-to-br from-brand-logo-som/12 to-brand-logo-cart/12 shadow-sm dark:border-border/50 dark:from-brand-logo-som/18 dark:to-brand-logo-cart/18",
          s.box,
        )}
        aria-hidden
      >
        <ShoppingCart className={cn(s.cart, "text-brand-logo-cart")} strokeWidth={2.25} />
        <Package
          className={cn("absolute -bottom-0.5 -right-0.5 text-brand-logo-som", s.pkg)}
          strokeWidth={2.5}
        />
      </span>
      <span className={cn("min-w-0 truncate font-extrabold tracking-tight leading-none", s.text)}>
        {second ? (
          splitSpace ? (
            <>
              <span className="text-brand-logo-cart">{first}</span>
              <span className="text-brand-logo-som">{" "}{second}</span>
            </>
          ) : (
            <>
              <span className="text-brand-logo-som">{first}</span>
              <span className="text-brand-logo-cart">{second}</span>
            </>
          )
        ) : (
          <span className="text-brand-logo-cart">{first}</span>
        )}
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
      className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 md:shrink-0"
    >
      {mark}
    </Link>
  );
}
