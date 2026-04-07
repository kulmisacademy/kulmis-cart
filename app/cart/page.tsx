"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { lines, subtotal, setQuantity, removeItem, isReady } = useCart();

  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Your cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review items, then continue to checkout to place your order.</p>

        {!isReady ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading cart…</p>
        ) : lines.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center text-card-foreground">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link
              href="/products"
              className="btn-brand-accent mt-4 px-4 py-2 text-sm"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {lines.map((line) => (
              <li
                key={line.productId}
                className="flex gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground"
              >
                <Link href={`/products/${line.productId}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={line.image} alt={line.title} fill className="object-contain object-center p-0.5" sizes="80px" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${line.productId}`} className="font-semibold text-foreground hover:text-brand-primary">
                    {line.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{line.storeName}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">${line.price.toFixed(2)} each</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      Qty
                      <input
                        suppressHydrationWarning
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={999}
                        value={line.quantity}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n)) setQuantity(line.productId, n);
                        }}
                        className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(line.productId)}
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 size={14} aria-hidden />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {isReady && lines.length > 0 ? (
          <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card/95 p-5 text-card-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex justify-between text-base font-semibold text-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">${subtotal.toFixed(2)}</span>
            </div>
            <Link
              href="/checkout"
              className="btn-brand-accent inline-flex justify-center py-3 text-center text-sm font-semibold"
            >
              Continue to order
            </Link>
            <Link
              href="/products"
              className="inline-flex justify-center rounded-lg border border-border bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Continue shopping
            </Link>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
