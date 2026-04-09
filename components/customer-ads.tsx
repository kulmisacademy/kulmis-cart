"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { cn } from "@/lib/utils";

type EligibleAd = {
  id: string;
  title: string;
  type: "banner" | "popup" | "text";
  imageUrl: string | null;
  description: string | null;
  link: string | null;
  popupDelayMs: number;
};

type PageKey = "home" | "products" | "store";

function pageTargetFromPath(pathname: string): PageKey | null {
  if (pathname === "/") return "home";
  if (pathname === "/products" || pathname.startsWith("/products/")) return "products";
  const parts = pathname.split("/").filter(Boolean);
  if ((parts[0] === "stores" || parts[0] === "store") && parts.length >= 2) return "store";
  return null;
}

function viewSessionKey(page: PageKey, adId: string) {
  return `kulmis_ad_view_${page}_${adId}`;
}

function dismissSessionKey(adId: string) {
  return `kulmis_ad_dismiss_${adId}`;
}

function useEligibleAds(page: PageKey | null) {
  const { customer, loading } = useCustomerAuth();
  const [ads, setAds] = useState<EligibleAd[]>([]);

  useEffect(() => {
    if (loading || !customer || !page) {
      setAds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/ads/eligible?page=${page}`, { credentials: "include" });
      const data = (await res.json()) as { ads?: EligibleAd[] };
      if (!cancelled && data.ads) setAds(data.ads);
    })();
    return () => {
      cancelled = true;
    };
  }, [customer, loading, page]);

  return ads;
}

function recordViewOnce(page: PageKey, adId: string) {
  if (typeof sessionStorage === "undefined") return;
  const key = viewSessionKey(page, adId);
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  void fetch("/api/ads/event", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adId, type: "view" }),
  });
}

async function recordClick(adId: string) {
  await fetch("/api/ads/event", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adId, type: "click" }),
  });
}

/** Normalize image src for <img> (relative paths stay same-origin). */
function adImageSrc(url: string): string {
  const t = url.trim();
  if (t.startsWith("/") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("data:")) {
    return t;
  }
  return t;
}

function AdImage({
  src,
  alt,
  className,
  imgClassName,
  variant = "cover",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Popups use contain + min height so the image is always visible */
  variant?: "cover" | "contain";
}) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        className={cn(
          "flex min-h-[160px] w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="size-10 opacity-50" aria-hidden />
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative w-full min-h-[140px] overflow-hidden bg-muted/60",
        variant === "contain" && "min-h-[200px] sm:min-h-[220px]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={adImageSrc(src)}
        alt={alt}
        className={cn(
          variant === "cover" ? "h-full min-h-[140px] w-full object-cover" : "h-full min-h-[200px] w-full object-contain object-center sm:min-h-[220px]",
          imgClassName,
        )}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

function PromoCard({
  ad,
  page,
  denseTitle,
}: {
  ad: EligibleAd;
  page: PageKey;
  /** Text-only strip uses slightly smaller typography */
  denseTitle?: boolean;
}) {
  useEffect(() => {
    recordViewOnce(page, ad.id);
  }, [ad.id, page]);

  const hasImage = Boolean(ad.imageUrl?.trim());

  const body = (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-md ring-1 ring-border/40 transition-all duration-300",
        "hover:shadow-xl hover:ring-brand-primary/25",
        ad.link && "cursor-pointer",
      )}
    >
      {hasImage ? (
        <AdImage
          src={ad.imageUrl!}
          alt={ad.title}
          className="aspect-[21/9] min-h-[140px] max-h-[220px] sm:min-h-[160px] sm:max-h-[260px]"
          imgClassName="object-cover object-center"
        />
      ) : null}
      <div className="min-w-0 space-y-1.5 p-4 sm:p-5">
        <p className={cn("font-semibold leading-snug text-foreground", denseTitle ? "text-sm" : "text-base")}>
          {ad.title}
        </p>
        {ad.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{ad.description}</p>
        ) : null}
        {ad.link ? (
          <p className="pt-1 text-xs font-medium text-brand-primary">Tap to open link →</p>
        ) : null}
      </div>
    </div>
  );

  if (ad.link) {
    return (
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
        onClick={() => void recordClick(ad.id)}
      >
        {body}
      </a>
    );
  }
  return body;
}

function TextStrip({ ad, page }: { ad: EligibleAd; page: PageKey }) {
  const hasImage = Boolean(ad.imageUrl?.trim());

  useEffect(() => {
    if (hasImage) return;
    recordViewOnce(page, ad.id);
  }, [ad.id, page, hasImage]);

  if (hasImage) {
    return <PromoCard ad={ad} page={page} denseTitle />;
  }

  const content = (
    <p className="text-center text-sm text-foreground">
      {ad.description ?? ad.title}
      {ad.link ? (
        <a
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 font-semibold text-brand-primary underline"
          onClick={() => void recordClick(ad.id)}
        >
          Learn more
        </a>
      ) : null}
    </p>
  );

  return (
    <div className="rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-md ring-1 ring-border/30 backdrop-blur-md">
      {content}
    </div>
  );
}

/** @deprecated Use PromoCard — kept as alias for banner type */
function BannerBlock({ ad, page }: { ad: EligibleAd; page: PageKey }) {
  return <PromoCard ad={ad} page={page} />;
}

function PopupModal({ ad, page }: { ad: EligibleAd; page: PageKey }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(dismissSessionKey(ad.id))) {
      setDismissed(true);
      return;
    }
    const delay = Math.max(0, ad.popupDelayMs);
    const t = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(t);
  }, [ad.id, ad.popupDelayMs]);

  useEffect(() => {
    if (visible && !dismissed) {
      recordViewOnce(page, ad.id);
    }
  }, [visible, dismissed, ad.id, page]);

  if (dismissed || !visible) return null;

  function close() {
    setVisible(false);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(dismissSessionKey(ad.id), "1");
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-border/50">
        <button
          type="button"
          className="absolute right-2 top-2 z-10 rounded-full bg-background/95 p-1.5 text-foreground shadow-md hover:bg-muted"
          onClick={close}
          aria-label="Close ad"
        >
          <X className="size-5" />
        </button>
        {ad.imageUrl?.trim() ? (
          <AdImage src={ad.imageUrl} alt={ad.title} variant="contain" />
        ) : null}
        <div className="p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-foreground">{ad.title}</h3>
          {ad.description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ad.description}</p> : null}
          {ad.link ? (
            <a
              href={ad.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
              onClick={() => void recordClick(ad.id)}
            >
              Open link
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CustomerAds() {
  const pathname = usePathname();
  const page = pageTargetFromPath(pathname);
  const ads = useEligibleAds(page);

  const stackKey = useMemo(() => `${pathname}-${ads.map((a) => a.id).join(",")}`, [pathname, ads]);

  if (!page || ads.length === 0) return null;

  const banners = ads.filter((a) => a.type === "banner");
  const texts = ads.filter((a) => a.type === "text");
  const popups = ads.filter((a) => a.type === "popup");

  return (
    <>
      {(banners.length > 0 || texts.length > 0) && (
        <div
          key={stackKey}
          className="pointer-events-none fixed inset-x-0 top-14 z-30 flex max-h-[min(50vh,420px)] flex-col gap-3 overflow-y-auto px-3 pb-2 sm:top-16 sm:px-4"
        >
          <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-3">
            {/* Image promos first so visuals are not buried under text strips */}
            {banners.map((ad) => (
              <BannerBlock key={ad.id} ad={ad} page={page} />
            ))}
            {texts.map((ad) => (
              <TextStrip key={ad.id} ad={ad} page={page} />
            ))}
          </div>
        </div>
      )}
      {popups.map((ad) => (
        <PopupModal key={ad.id} ad={ad} page={page} />
      ))}
    </>
  );
}
