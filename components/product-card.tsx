"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, MessageCircle, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/data";
import { useCart } from "@/lib/cart-context";
import { useCustomerOrderWhatsApp } from "@/lib/hooks/use-customer-order-whatsapp";
import { getStockBadge } from "@/lib/product-stock";
import { getPrimaryImage } from "@/lib/utils-product";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";

export type ProductCardProps = {
  product: Product;
  /** Vendor/store phone (optional; WhatsApp order uses server lookup if omitted). */
  phone?: string;
  /** Slightly denser image band for featured rows. */
  compact?: boolean;
  className?: string;
};

export function ProductCard({ product, compact = false, className }: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [orderBusy, setOrderBusy] = useState(false);
  const img = getPrimaryImage(product);
  const detailHref = `/products/${product.id}`;
  const { placeOrder, loading: authLoading, isAuthenticated } = useCustomerOrderWhatsApp(detailHref);
  const badge = getStockBadge(product);

  async function onOrderWhatsApp(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOrderBusy(true);
    try {
      await placeOrder(product.id);
    } finally {
      setOrderBusy(false);
    }
  }

  function onCardActivate() {
    router.push(detailHref);
  }

  const imageBand = compact ? "h-28 md:h-36 lg:h-40" : "h-32 md:h-40 lg:h-44";

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={onCardActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardActivate();
        }
      }}
      className={cn(
        "group flex h-full min-h-0 cursor-pointer flex-col justify-between self-stretch overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition dark:bg-slate-900",
        "md:duration-300 md:hover:-translate-y-1 md:hover:shadow-lg",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex w-full shrink-0 items-center justify-center overflow-hidden bg-gray-100 dark:bg-slate-800/90",
          imageBand,
        )}
      >
        <span
          className={cn(
            "absolute left-1.5 top-1.5 z-10 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide max-md:left-1 max-md:top-1 md:text-[9px]",
            badge.className,
          )}
        >
          {badge.label}
        </span>
        <Image
          src={img}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 45vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain object-center p-1.5 md:p-2"
          loading="lazy"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="flex min-h-0 flex-1 flex-col gap-1 p-2 md:gap-2 md:p-3">
          <p className="flex min-w-0 items-center gap-0.5 truncate text-[10px] text-muted-foreground md:gap-1 md:text-xs">
            <Building2 size={10} className="shrink-0 md:size-3" aria-hidden />
            <span className="truncate md:inline">
              <span className="md:hidden">{product.region}</span>
              <span className="hidden md:inline">
                {product.region} · {product.storeName}
              </span>
            </span>
          </p>
          {product.storeVerified ? (
            <VerifiedBadge
              size="sm"
              className="w-fit max-md:gap-0.5 max-md:px-1 max-md:py-0 max-md:text-[9px] max-md:[&_svg]:size-2.5 normal-case tracking-normal"
            />
          ) : null}
          <h3 className="line-clamp-2 text-xs font-semibold leading-tight text-foreground md:text-sm md:leading-snug">
            {product.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1 md:gap-2">
            <span className="text-sm font-bold tabular-nums text-foreground md:text-base">${product.price.toFixed(2)}</span>
            {product.oldPrice != null ? (
              <span className="text-[10px] tabular-nums text-muted-foreground line-through md:text-xs">
                ${product.oldPrice.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className="mt-auto flex shrink-0 flex-col gap-1 p-2 pt-0 md:gap-2 md:border-t md:border-border/60 md:pt-3 dark:md:border-slate-700/80"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="inline-flex min-h-9 w-full touch-manipulation items-center justify-center gap-1 rounded-md border border-border bg-background py-1.5 text-xs font-medium text-foreground transition active:bg-muted md:min-h-10 md:rounded-lg md:py-2 md:text-sm"
            onClick={() => addItem(product, 1)}
          >
            <ShoppingCart className="size-3.5 shrink-0 md:size-4" aria-hidden />
            <span className="md:hidden">Add</span>
            <span className="hidden md:inline">Add to cart</span>
          </button>
          <button
            type="button"
            disabled={authLoading || orderBusy}
            aria-label={isAuthenticated ? "Order via WhatsApp" : "Log in to order via WhatsApp"}
            onClick={(e) => void onOrderWhatsApp(e)}
            className="inline-flex min-h-9 w-full touch-manipulation items-center justify-center gap-1 rounded-md bg-[#00a884] py-1.5 text-xs font-semibold text-white transition hover:bg-[#009970] active:opacity-90 disabled:opacity-60 md:min-h-10 md:rounded-lg md:py-2 md:text-sm"
          >
            <MessageCircle className="size-3.5 shrink-0 text-white md:size-4" aria-hidden />
            {authLoading || orderBusy ? (
              "…"
            ) : (
              <>
                <span className="md:hidden">{isAuthenticated ? "Order" : "Login"}</span>
                <span className="hidden md:inline">
                  {isAuthenticated ? "Order on WhatsApp" : "Login to order"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
