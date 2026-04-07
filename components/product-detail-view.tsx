"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/data";
import { getGalleryImages } from "@/lib/utils-product";
import { publicStoreHref } from "@/lib/store-public-path";
import { productUrl } from "@/lib/site";
import { ChatPopup } from "@/components/chat-popup";
import type { ChatProductCard } from "@/components/chat-room";
import { CopyLinkButton } from "@/components/copy-link-button";
import { useCart } from "@/lib/cart-context";
import { useCustomerOrderWhatsApp } from "@/lib/hooks/use-customer-order-whatsapp";
import { MessageCircle, Share2, ShoppingCart } from "lucide-react";
import { ProductVideo } from "@/components/product-video";
import { VerifiedBadge } from "@/components/verified-badge";

type Props = {
  product: Product;
};

export function ProductDetailView({ product }: Props) {
  const pathname = usePathname();
  const { addItem } = useCart();
  const gallery = getGalleryImages(product);
  const [active, setActive] = useState(0);
  const [orderBusy, setOrderBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatProduct: ChatProductCard = useMemo(
    () => ({
      productId: product.id,
      name: product.title,
      price: product.price,
      image: product.image,
      link: `/products/${product.id}`,
      region: product.region,
      storeName: product.storeName,
    }),
    [product.id, product.image, product.price, product.region, product.storeName, product.title],
  );
  const nextPath = pathname || `/products/${product.id}`;
  const { placeOrder, loading: authLoading, isAuthenticated } = useCustomerOrderWhatsApp(nextPath);
  const [productShareUrl, setProductShareUrl] = useState(() => productUrl(product.id));
  useEffect(() => {
    setProductShareUrl(`${window.location.origin}/products/${product.id}`);
  }, [product.id]);
  const shareText = `${product.title} — ${productShareUrl}`;
  const waShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const storeHref = publicStoreHref(product.storeName, product.vendorId);

  async function onOrderWhatsApp() {
    setOrderBusy(true);
    try {
      await placeOrder(product.id);
    } finally {
      setOrderBusy(false);
    }
  }

  return (
    <div className="bg-background pb-8 text-foreground md:pb-8">
      <div className="mx-auto min-w-0 max-w-brand px-4 py-6 sm:px-6 lg:py-10">
        <Link href={storeHref} className="mb-6 inline-flex text-sm font-medium text-brand-primary hover:underline">
          ← Back to store
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src={gallery[active] ?? product.image}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            {gallery.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition sm:h-20 sm:w-20 ${
                      active === i ? "border-brand-primary ring-2 ring-brand-primary/25 dark:ring-brand-primary/40" : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            ) : null}

            {product.videoUrl ? <ProductVideo url={product.videoUrl} /> : null}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">{product.storeName}</p>
              {product.storeVerified ? <VerifiedBadge size="md" /> : null}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{product.title}</h1>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground">${product.price.toFixed(2)}</span>
              {product.oldPrice != null ? (
                <span className="text-xl text-muted-foreground line-through">${product.oldPrice.toFixed(2)}</span>
              ) : null}
            </div>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">{product.description}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Sold by{" "}
              <Link href={storeHref} className="font-semibold text-brand-primary hover:underline">
                {product.storeName}
              </Link>
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => addItem(product, 1)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-card-foreground transition hover:bg-muted sm:flex-none"
              >
                <ShoppingCart size={18} aria-hidden />
                Add to cart
              </button>
              <button
                type="button"
                disabled={authLoading || orderBusy}
                onClick={() => void onOrderWhatsApp()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00a884] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#009970] disabled:opacity-60 sm:flex-none"
              >
                <MessageCircle size={18} aria-hidden />
                {authLoading ? "Checking…" : orderBusy ? "Opening…" : isAuthenticated ? "Order on WhatsApp" : "Login to order"}
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-card-foreground transition hover:bg-muted sm:flex-none"
              >
                <MessageCircle size={18} aria-hidden />
                Chat with Seller
              </button>
              <a
                href={waShare}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-card-foreground transition hover:bg-muted sm:flex-none"
              >
                <Share2 size={18} />
                Share product
              </a>
              <CopyLinkButton
                url={`/products/${product.id}`}
                label="Copy product link"
                className="w-full justify-center sm:w-auto"
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Or add to cart and checkout — we will open WhatsApp with the seller after you place your order.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={authLoading || orderBusy}
            onClick={() => void onOrderWhatsApp()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] py-3 text-sm font-semibold text-white hover:bg-[#009970] disabled:opacity-60"
          >
            <MessageCircle size={18} aria-hidden />
            {authLoading ? "Checking…" : orderBusy ? "Opening…" : isAuthenticated ? "WhatsApp" : "Login"}
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-card-foreground hover:bg-muted"
          >
            <MessageCircle size={18} aria-hidden />
            Chat seller
          </button>
        </div>
      </div>

      <div className="h-24 md:hidden" aria-hidden />

      <ChatPopup
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        storeSlug={product.storeSlug}
        storeName={product.storeName}
        initialProduct={chatProduct}
      />
    </div>
  );
}
