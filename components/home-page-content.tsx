"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckoutValueSection } from "@/components/checkout-value-section";
import { HeroSection } from "@/components/hero-section";
import { ProductCard } from "@/components/cards";
import { TestimonialsSection } from "@/components/testimonials-section";
import { TopStoresSection } from "@/components/top-stores-section";
import { useTranslations } from "@/lib/locale-context";
import type { Product, Store, Testimonial } from "@/lib/data";

const AiProductSection = dynamic(
  () => import("@/components/ai-product-section").then((m) => ({ default: m.AiProductSection })),
  { ssr: true },
);
const LaunchRoadmap = dynamic(
  () => import("@/components/launch-roadmap").then((m) => ({ default: m.LaunchRoadmap })),
  { ssr: true },
);

type Props = {
  featuredProducts: Product[];
  topStores: Store[];
  /** Live DB ratings for top store cards (slug → average + review count). */
  liveRatingsBySlug?: Record<string, { average: number; count: number }>;
  /** Live follower counts for top store cards. */
  followersBySlug?: Record<string, number>;
  testimonials: Testimonial[];
  /** Store phone for featured product rows only — avoids sending every store (with large images) to the client. */
  featuredStorePhones: Record<string, string>;
};

export function HomePageContent({
  featuredProducts,
  topStores,
  liveRatingsBySlug,
  followersBySlug,
  testimonials,
  featuredStorePhones,
}: Props) {
  const { t } = useTranslations();

  return (
    <>
      <HeroSection />

      <CheckoutValueSection />

      <section className="mx-auto w-full max-w-brand px-3 py-12 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-foreground">{t("home.featuredTitle")}</h2>
          <Link href="/products" className="link-brand text-sm">
            {t("home.featuredViewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3 [&>article]:min-h-0">
          {featuredProducts.map((product) => {
            const phone = featuredStorePhones[product.storeSlug] ?? "";
            return <ProductCard key={product.id} product={product} phone={phone} compact />;
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-brand px-4 py-10 sm:px-6">
        <TopStoresSection
          stores={topStores}
          liveRatingsBySlug={liveRatingsBySlug}
          followersBySlug={followersBySlug}
          title={t("topStores.title")}
          subtitle={t("topStores.subtitle")}
          eyebrow={t("topStores.eyebrow")}
        />
      </section>

      <AiProductSection />

      <LaunchRoadmap />

      <TestimonialsSection items={testimonials} />
    </>
  );
}
