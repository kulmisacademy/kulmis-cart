"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Flame, MessageCircle, Star, Trophy } from "lucide-react";
import type { Store } from "@/lib/data";
import { publicStoreHref } from "@/lib/store-public-path";
import { VerifiedBadge } from "@/components/verified-badge";
import { createWhatsAppStoreHelloLink } from "@/lib/whatsapp";
import { formatFollowerCount } from "@/lib/format-followers";
import { formatNumberEn } from "@/lib/format-hydration-safe";
import { cn } from "@/lib/utils";

export type TopStoreCardProps = {
  store: Store;
  /** Stagger fade-in delay (ms) */
  staggerIndex?: number;
  className?: string;
  /** Live averages from customer feedback (overrides static rating when there is feedback) */
  liveRating?: { average: number; count: number };
  /** Live follower count from DB */
  followerCount?: number;
};

export function TopStoreCard({
  store,
  staggerIndex = 0,
  className,
  liveRating,
  followerCount,
}: TopStoreCardProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showImage = Boolean(store.logoUrl) && !logoFailed;
  const wa = createWhatsAppStoreHelloLink(store.phone, store.name);
  const hasTopRated = store.badges?.includes("top-rated");
  const hasBestSeller = store.badges?.includes("best-seller");
  const hasLiveReviews = Boolean(liveRating && liveRating.count > 0);
  const displayRating = hasLiveReviews ? liveRating!.average : store.rating;
  const displayReviews = hasLiveReviews ? liveRating!.count : store.totalReviews;
  const followers = followerCount ?? 0;

  return (
    <article
      className={cn(
        "store-card-enter group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-md ring-1 ring-border/60 transition duration-300 ease-out",
        "hover:z-10 hover:scale-[1.03] hover:shadow-xl hover:shadow-brand-primary/10 hover:ring-brand-primary/25",
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
        className,
      )}
      style={{ animationDelay: `${staggerIndex * 75}ms` }}
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-brand-primary/0 via-brand-primary/0 to-brand-secondary/0 opacity-0 blur-2xl transition duration-500 group-hover:from-brand-primary/15 group-hover:via-brand-primary/5 group-hover:to-brand-secondary/10 group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        {/* Bonus chips */}
        {(hasTopRated || hasBestSeller) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {hasTopRated ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                <Flame className="size-3" aria-hidden />
                Top rated
              </span>
            ) : null}
            {hasBestSeller ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                <Trophy className="size-3" aria-hidden />
                Best seller
              </span>
            ) : null}
          </div>
        )}

        <div className="flex gap-4">
          {/* Logo */}
          <div
            className={cn(
              "relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted shadow-md ring-2 ring-border",
              showImage ? "" : "bg-gradient-to-br from-slate-800 to-slate-900 text-white",
            )}
          >
            {showImage ? (
              <Image
                src={store.logoUrl!}
                alt={`${store.name} logo`}
                fill
                className="object-cover"
                sizes="72px"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="text-lg font-bold tracking-tight">{store.logo}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-lg font-bold leading-tight text-foreground">{store.name}</h3>
              {store.isVerified ? <VerifiedBadge size="sm" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {store.region} / {store.district}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                <Star className="size-4 fill-[#FACC15] text-[#FACC15]" aria-hidden />
                {hasLiveReviews || store.rating > 0 ? displayRating.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({hasLiveReviews || store.totalReviews > 0 ? formatNumberEn(displayReviews) : "0"}{" "}
                {displayReviews === 1 ? "review" : "reviews"})
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                ❤️ {formatFollowerCount(followers)} followers
              </span>
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{store.description}</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={publicStoreHref(store.name, store.vendorId)}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted active:scale-[0.98]"
          >
            View store →
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00a884] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#009970] active:scale-[0.98]"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
