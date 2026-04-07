import { AdminAdsPage } from "@/components/admin-ads-page";
import { getAnalyticsAll, listAllAds } from "@/lib/ads-db";

export const dynamic = "force-dynamic";

export default async function AdminAdsRoutePage() {
  const [rows, analytics] = await Promise.all([listAllAds(), getAnalyticsAll()]);
  const initialAds = rows.map((a) => {
    const s = analytics.get(a.id) ?? { views: 0, clicks: 0 };
    const ctr = s.views > 0 ? (s.clicks / s.views) * 100 : 0;
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      imageUrl: a.imageUrl,
      description: a.description,
      link: a.link,
      regionTarget: a.regionTarget,
      pageTarget: a.pageTarget,
      isActive: a.isActive,
      maxViewsPerUser: a.maxViewsPerUser,
      popupDelayMs: a.popupDelayMs,
      views: s.views,
      clicks: s.clicks,
      ctr,
    };
  });

  return <AdminAdsPage initialAds={initialAds} />;
}
