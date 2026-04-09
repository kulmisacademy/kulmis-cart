import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Globe, Heart, MapPin, MessageCircle, Phone, Share2, Star } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StoreFollowButton } from "@/components/store-follow-button";
import { StoreInventorySearchProvider } from "@/components/store-inventory-search-context";
import { StoreProductBrowser } from "@/components/store-product-browser";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatFollowerCount } from "@/lib/format-followers";
import {
  getFollowerCountForStore,
  getStoreRatingSummaries,
  incrementStoreView,
  listPublicFeedbackForStore,
} from "@/lib/customer/db";
import { getProductsByStoreSlug, resolveStoreFromPublicRouteSegment } from "@/lib/marketplace-catalog";
import { publicStoreHref } from "@/lib/store-public-path";
import { getSiteUrl, storeUrl } from "@/lib/site";

const defaultBanner =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80";

type StoreDetailProps = {
  params: Promise<{ slug: string }>;
};

export default async function StoreProfilePage({ params }: StoreDetailProps) {
  const { slug: raw } = await params;
  const segment = decodeURIComponent(raw ?? "").trim();
  if (!segment) notFound();

  const resolved = await resolveStoreFromPublicRouteSegment(segment);
  if (!resolved) notFound();

  const { store, canonicalSegment } = resolved;
  if (segment.toLowerCase() !== canonicalSegment.toLowerCase()) {
    redirect(`/store/${encodeURIComponent(canonicalSegment)}`);
  }

  void incrementStoreView(store.slug).catch(() => undefined);

  const [storeProducts, socialBlock] = await Promise.all([
    getProductsByStoreSlug(store.slug),
    (async () => {
      let liveSummary: { average: number; count: number } | null = null;
      let feedbackRows: Awaited<ReturnType<typeof listPublicFeedbackForStore>> = [];
      let followerCount = 0;
      try {
        const [summaries, fb, followers] = await Promise.all([
          getStoreRatingSummaries([store.slug]),
          listPublicFeedbackForStore(store.slug, 12),
          getFollowerCountForStore(store.slug),
        ]);
        const s = summaries[store.slug];
        if (s && s.count > 0) liveSummary = { average: s.average, count: s.count };
        feedbackRows = fb;
        followerCount = followers;
      } catch {
        /* ignore — show store without live ratings */
      }
      return { liveSummary, feedbackRows, followerCount };
    })(),
  ]);

  const { liveSummary, feedbackRows, followerCount } = socialBlock;
  const banner = store.bannerImage ?? defaultBanner;
  const storeLink = storeUrl(store.name, store.vendorId);
  const siteHost = new URL(getSiteUrl()).hostname;
  const profilePath = publicStoreHref(store.name, store.vendorId);

  const trustRating = liveSummary ? Math.round(liveSummary.average * 10) / 10 : store.rating;
  const trustCount = liveSummary ? liveSummary.count : store.totalReviews;

  return (
    <StoreInventorySearchProvider>
      <PageScaffold>
        <SiteHeader />
        <main>
        <section className="relative">
          <div className="relative mx-auto min-w-0 max-w-brand">
            <div className="relative h-48 w-full overflow-hidden sm:h-56 md:h-64">
              <Image
                src={banner}
                alt=""
                fill
                className="object-cover blur-[2px] brightness-95"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-slate-900/20 to-slate-900/20" />
              <div className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 translate-y-1/2 sm:left-8 sm:translate-x-0">
                {store.logoUrl ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-background shadow-xl ring-2 ring-border/60 sm:h-28 sm:w-28">
                    <Image src={store.logoUrl} alt={store.name} fill className="object-cover" unoptimized sizes="112px" />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-background bg-slate-900 text-2xl font-bold text-white shadow-xl ring-2 ring-border/60 sm:h-28 sm:w-28">
                    {store.logo}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative mx-auto min-w-0 max-w-brand px-4 pb-8 pt-16 sm:px-6 sm:pt-14">
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-left sm:text-3xl md:text-4xl">
                  {store.name}
                </h1>
                {store.isVerified ? <VerifiedBadge size="lg" /> : null}
              </div>
              <p className="mt-2 max-w-xl text-center text-sm text-muted-foreground sm:text-left sm:text-base">{store.description}</p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-semibold text-foreground sm:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-4 fill-[#FACC15] text-[#FACC15]" aria-hidden />
                  <span className="tabular-nums">{trustRating.toFixed(1)}</span>
                  <span className="font-normal text-muted-foreground">
                    ({trustCount.toLocaleString()} {trustCount === 1 ? "review" : "reviews"})
                  </span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="inline-flex items-center gap-1.5 font-normal text-muted-foreground">
                  <Heart className="size-4 fill-red-500/20 text-red-500" aria-hidden />
                  <span className="tabular-nums text-foreground">{formatFollowerCount(followerCount)}</span>
                  followers
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground sm:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={16} className="shrink-0 text-slate-500" />
                  {store.region} · {store.district}
                </span>
                <a href={`tel:${store.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-primary dark:hover:text-brand-primary/90">
                  <Phone size={16} className="shrink-0 text-slate-500" />
                  {store.phone}
                </a>
                <span className="inline-flex items-center gap-1.5">
                  <Globe size={16} className="shrink-0 text-slate-500" />
                  {siteHost}
                </span>
              </div>

              <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-start">
                <a
                  href={`https://wa.me/${(store.phone ?? "").replace(/\+/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <MessageCircle size={18} />
                  WhatsApp store
                </a>
                <CopyLinkButton
                  url={publicStoreHref(store.name, store.vendorId)}
                  label="Copy store link"
                  className="rounded-full py-3"
                />
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out ${store.name}: ${storeLink}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-muted dark:hover:bg-muted/50"
                >
                  <Share2 size={18} />
                  Share store
                </a>
                <StoreFollowButton
                  storeSlug={store.slug}
                  storeProfilePath={profilePath}
                  initialFollowerCount={followerCount}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto min-w-0 max-w-brand px-3 pb-16 sm:px-6">
          <StoreProductBrowser products={storeProducts} phone={store.phone} />

          <section className="mt-14 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-shadow duration-300 hover:shadow-lg md:grid md:grid-cols-[220px_1fr] md:gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-foreground">Trust & Feedback</h3>
              <p className="mt-3 text-4xl font-bold text-brand-primary sm:text-5xl tabular-nums">
                {trustRating.toFixed(1)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {trustCount.toLocaleString()} customer {trustCount === 1 ? "review" : "reviews"}
                {liveSummary ? "" : trustCount === 0 ? " — be the first to leave feedback after an order." : ""}
              </p>
            </div>
            <div className="mt-6 space-y-4 border-t border-border pt-6 md:mt-0 md:border-t-0 md:border-l md:pl-8 md:pt-0">
              {feedbackRows.length > 0 ? (
                feedbackRows.map((f, i) => (
                  <div key={`${f.createdAt}-${i}`}>
                    <p className="font-semibold text-foreground">
                      {f.author}{" "}
                      <span className="text-xs font-normal text-muted-foreground">· {f.rating}/5</span>
                    </p>
                    {f.presetOption ? (
                      <p className="mt-1 text-sm font-medium text-foreground">{f.presetOption}</p>
                    ) : null}
                    {f.comment ? (
                      <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p>
                    ) : !f.presetOption ? (
                      <p className="text-sm text-muted-foreground">—</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No public feedback yet.</p>
              )}
            </div>
          </section>

          <div className="mt-10 flex justify-center">
            <Link
              href="/products"
              className="rounded-full border border-border bg-card px-8 py-2.5 text-sm font-semibold text-card-foreground shadow-sm hover:bg-muted"
            >
              Browse all products
            </Link>
          </div>
        </div>
      </main>
        <SiteFooter />
      </PageScaffold>
    </StoreInventorySearchProvider>
  );
}
