"use client";

import { DollarSign, Eye, Heart, Package, ShoppingCart, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { useVendorDashboard } from "./vendor-dashboard-provider";
import { apiFetch } from "@/lib/api-client";
import { formatDateTimeEnUtc, formatNumberEn } from "@/lib/format-hydration-safe";

type StoreInsights = {
  followers: number;
  views: number;
  avgRating: number;
  reviewCount: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  feedback: Array<{
    author: string;
    rating: number;
    presetOption: string | null;
    comment: string;
    createdAt: string;
  }>;
};

export function VendorOverview() {
  const { t } = useTranslations();
  const { state } = useVendorDashboard();
  const [insights, setInsights] = useState<StoreInsights | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/api/vendor/store-insights");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as StoreInsights;
        if (!cancelled) setInsights(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalProducts = state.products.length;
  const totalOrders = insights?.totalOrders ?? state.orders.length;
  const earnings =
    insights?.totalRevenue ??
    state.orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0);
  const rating = insights && insights.reviewCount > 0 ? insights.avgRating : 0;
  const followers = insights?.followers ?? 0;
  const views = insights?.views ?? state.analytics?.totalViews ?? 0;

  const cardClass = cn(
    "rounded-2xl border border-border bg-card shadow-sm transition-all duration-300",
    "hover:shadow-xl hover:border-brand-primary/20 dark:bg-slate-900 dark:border-slate-800",
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.overview.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("vendor.overview.subtitle")}</p>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className={cardClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.stats.products")}</CardTitle>
              <Package className="size-4 shrink-0 text-brand-primary" aria-hidden />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalProducts}</p>
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.stats.orders")}</CardTitle>
              <ShoppingCart className="size-4 shrink-0 text-brand-secondary" aria-hidden />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalOrders}</p>
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.stats.views")}</CardTitle>
              <Eye className="size-4 shrink-0 text-cyan-500" aria-hidden />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold tabular-nums text-foreground">{formatNumberEn(views)}</p>
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.stats.rating")}</CardTitle>
              <Star className="size-4 shrink-0 text-brand-star" aria-hidden />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {insights && insights.reviewCount > 0 ? rating.toFixed(1) : "—"}
              </p>
              {insights && insights.reviewCount > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {insights.reviewCount} {insights.reviewCount === 1 ? "review" : "reviews"}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No reviews yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revenue & audience</p>
        <div className="grid grid-cols-2 gap-4 md:max-w-xl md:grid-cols-2">
          <Card className={cardClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.stats.earnings")}</CardTitle>
              <DollarSign className="size-4 shrink-0 text-brand-accent" aria-hidden />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold tabular-nums text-foreground">${earnings.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card className={cardClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.stats.followers")}</CardTitle>
              <Heart className="size-4 shrink-0 text-red-500" aria-hidden />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold tabular-nums text-foreground">{formatNumberEn(followers)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {insights && insights.feedback.length > 0 ? (
        <section
          className={cn(
            "rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow duration-300",
            "hover:shadow-lg dark:border-slate-800",
          )}
        >
          <h2 className="text-lg font-semibold text-foreground">Customer feedback</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recent preset feedback from completed orders.</p>
          <ul className="mt-4 space-y-4">
            {insights.feedback.slice(0, 8).map((f, i) => (
              <li key={`${f.createdAt}-${i}`} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="font-medium text-foreground">
                  {f.author}{" "}
                  <span className="text-xs font-normal text-muted-foreground">· {f.rating}/5</span>
                </p>
                {f.presetOption ? <p className="mt-1 text-sm text-foreground">{f.presetOption}</p> : null}
                {f.comment ? <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeEnUtc(f.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
