"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
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

function BannerBlock({
  ad,
  page,
}: {
  ad: EligibleAd;
  page: PageKey;
}) {
  useEffect(() => {
    recordViewOnce(page, ad.id);
  }, [ad.id, page]);

  const inner = (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
        ad.link && "cursor-pointer",
      )}
    >
      {ad.imageUrl ? (
        <div className="flex min-h-[140px] w-full items-center justify-center bg-muted/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.imageUrl} alt="" className="max-h-40 w-full object-contain p-2" />
        </div>
      ) : null}
      <div className="min-w-0 p-3">
        <p className="text-sm font-semibold text-foreground">{ad.title}</p>
        {ad.description ? <p className="mt-1 text-xs text-muted-foreground"> {ad.description}</p> : null}
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
        {inner}
      </a>
    );
  }
  return inner;
}

function TextStrip({ ad, page }: { ad: EligibleAd; page: PageKey }) {
  useEffect(() => {
    recordViewOnce(page, ad.id);
  }, [ad.id, page]);

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
    <div className="rounded-xl border border-border bg-card/95 px-4 py-2 shadow-sm backdrop-blur">
      {content}
    </div>
  );
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
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1.5 text-foreground shadow hover:bg-muted"
          onClick={close}
          aria-label="Close ad"
        >
          <X className="size-5" />
        </button>
        {ad.imageUrl ? (
          <div className="flex max-h-48 w-full items-center justify-center bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.imageUrl} alt="" className="max-h-48 w-full object-contain p-4" />
          </div>
        ) : null}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground">{ad.title}</h3>
          {ad.description ? <p className="mt-2 text-sm text-muted-foreground">{ad.description}</p> : null}
          {ad.link ? (
            <a
              href={ad.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
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
          className="pointer-events-none fixed inset-x-0 top-14 z-30 flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-3 pb-2 sm:top-16 sm:px-4"
        >
          <div className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-2">
            {texts.map((ad) => (
              <TextStrip key={ad.id} ad={ad} page={page} />
            ))}
            {banners.map((ad) => (
              <BannerBlock key={ad.id} ad={ad} page={page} />
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
