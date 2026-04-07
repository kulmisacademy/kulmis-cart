import { HomePageContent } from "@/components/home-page-content";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { testimonials } from "@/lib/data";
import {
  getFollowerCountsForStores,
  getStoreRatingSummaries,
} from "@/lib/customer/db";
import { getMarketplaceProducts, getMarketplaceStores } from "@/lib/marketplace-catalog";

/** Cache the static marketplace snapshot for anonymous visitors (production). Ads still load client-side. */
export const revalidate = 60;

export default async function Home() {
  /** `getMarketplaceProducts` + `getMarketplaceStores` share one cached vendor scan per request. */
  const [products, allStores] = await Promise.all([getMarketplaceProducts(), getMarketplaceStores()]);
  const featuredProducts = products.slice(0, 4);

  const featuredStorePhones: Record<string, string> = {};
  for (const p of featuredProducts) {
    const st = allStores.find((s) => s.slug === p.storeSlug);
    if (st?.phone) featuredStorePhones[p.storeSlug] = st.phone;
  }

  const slugs = allStores.map((s) => s.slug);
  let summaries: Awaited<ReturnType<typeof getStoreRatingSummaries>> = {};
  let followersBySlug: Record<string, number> = {};
  try {
    ;[summaries, followersBySlug] = await Promise.all([
      getStoreRatingSummaries(slugs),
      getFollowerCountsForStores(slugs),
    ]);
  } catch {
    summaries = {};
    followersBySlug = {};
  }

  const ranked = [...allStores]
    .map((store) => {
      const live = summaries[store.slug];
      const rating = live && live.count > 0 ? live.average : store.rating;
      const count = live && live.count > 0 ? live.count : store.totalReviews;
      const followers = followersBySlug[store.slug] ?? 0;
      return { store, rating, count, followers };
    })
    .sort((a, b) => b.rating - a.rating || b.count - a.count || b.followers - a.followers);

  const topStoresSlice = ranked.slice(0, 3).map((r) => r.store);
  const liveRatingsForTop: Record<string, { average: number; count: number }> = {};
  const followersForTop: Record<string, number> = {};
  for (const r of ranked.slice(0, 3)) {
    const live = summaries[r.store.slug];
    if (live && live.count > 0) liveRatingsForTop[r.store.slug] = live;
    followersForTop[r.store.slug] = r.followers;
  }

  return (
    <PageScaffold>
      <SiteHeader />
      <main>
        <HomePageContent
          featuredProducts={featuredProducts}
          topStores={topStoresSlice}
          liveRatingsBySlug={liveRatingsForTop}
          followersBySlug={followersForTop}
          testimonials={testimonials}
          featuredStorePhones={featuredStorePhones}
        />
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
