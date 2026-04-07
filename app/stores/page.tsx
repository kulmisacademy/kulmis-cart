import { PageScaffold } from "@/components/page-scaffold";
import { TopStoreCard } from "@/components/top-store-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getFollowerCountsForStores, getStoreRatingSummaries } from "@/lib/customer/db";
import { getStoresByRating } from "@/lib/marketplace-catalog";

export default async function StoresPage() {
  const ordered = await getStoresByRating();
  const slugs = ordered.map((s) => s.slug);
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

  const merged = ordered
    .map((store) => {
      const live = summaries[store.slug];
      const rating = live && live.count > 0 ? live.average : store.rating;
      const count = live && live.count > 0 ? live.count : store.totalReviews;
      const followers = followersBySlug[store.slug] ?? 0;
      return {
        store,
        sortRating: rating,
        sortCount: count,
        followers,
        liveRating:
          live && live.count > 0 ? { average: live.average, count: live.count } : undefined,
      };
    })
    .sort(
      (a, b) =>
        b.sortRating - a.sortRating || b.sortCount - a.sortCount || b.followers - a.followers,
    );

  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-brand px-4 py-10 sm:px-6 lg:py-14">
        <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-lg ring-1 ring-border dark:shadow-black/30">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Top rated stores</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Explore trusted Somali vendors by region — ratings, verified badges, and WhatsApp in one tap. Sorted by
            rating (including live customer feedback when available).
          </p>
        </section>

        {merged.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
            No stores yet. Vendor registration creates listings here.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {merged.map(({ store, liveRating, followers }, index) => (
              <TopStoreCard
                key={store.slug}
                store={store}
                staggerIndex={index}
                liveRating={liveRating}
                followerCount={followers}
              />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
