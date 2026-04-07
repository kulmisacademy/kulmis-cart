import type { Store } from "@/lib/data";
import { TopStoreCard } from "@/components/top-store-card";

type Props = {
  stores: Store[];
  liveRatingsBySlug?: Record<string, { average: number; count: number }>;
  followersBySlug?: Record<string, number>;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  className?: string;
};

export function TopStoresSection({
  stores,
  liveRatingsBySlug,
  followersBySlug,
  title = "Top rated stores",
  subtitle = "Trusted vendors with strong ratings and WhatsApp-ready storefronts.",
  eyebrow = "Marketplace",
  className,
}: Props) {
  return (
    <section className={className}>
      <div className="mb-8 text-center text-foreground sm:mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
        {subtitle ? <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store, index) => (
          <TopStoreCard
            key={store.slug}
            store={store}
            staggerIndex={index}
            liveRating={liveRatingsBySlug?.[store.slug]}
            followerCount={followersBySlug?.[store.slug]}
          />
        ))}
      </div>
    </section>
  );
}
