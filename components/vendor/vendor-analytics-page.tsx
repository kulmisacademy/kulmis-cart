"use client";

import { useMemo } from "react";
import { BarChart3, Eye, MousePointerClick, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/locale-context";
import { formatNumberEn } from "@/lib/format-hydration-safe";
import { useVendorDashboard } from "./vendor-dashboard-provider";

export function VendorAnalyticsPage() {
  const { t } = useTranslations();
  const { state } = useVendorDashboard();

  const views = state.analytics?.totalViews ?? 0;
  const clicks = state.analytics?.productClicks ?? 0;
  const ordersLast7 = state.orders.filter((o) => {
    const d = new Date(o.createdAt).getTime();
    return Date.now() - d < 7 * 86400_000;
  }).length;

  const topProducts = useMemo(() => {
    const map = new Map<string, { title: string; count: number; revenue: number }>();
    for (const o of state.orders) {
      if (o.status !== "completed") continue;
      for (const it of o.items) {
        const cur = map.get(it.productId) ?? { title: it.title, count: 0, revenue: 0 };
        cur.count += it.qty;
        cur.revenue += it.price;
        map.set(it.productId, cur);
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [state.orders]);

  const bars = [35, 55, 42, 70, 48, 62, ordersLast7 > 0 ? Math.min(100, 30 + ordersLast7 * 8) : 25];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.analytics.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("vendor.analytics.hint")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.analytics.views")}</CardTitle>
            <Eye className="size-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{formatNumberEn(views)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.analytics.clicks")}</CardTitle>
            <MousePointerClick className="size-4 text-brand-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{formatNumberEn(clicks)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.analytics.ordersPerDay")}</CardTitle>
            <BarChart3 className="size-4 text-brand-secondary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{ordersLast7}</p>
            <p className="text-xs text-muted-foreground">7d</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("vendor.products.title")}</CardTitle>
            <ShoppingBag className="size-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{state.products.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("vendor.analytics.ordersPerDay")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-36 items-end gap-2">
            {bars.map((h, i) => (
              <div
                key={`bar-${i}`}
                className="flex-1 rounded-t-md bg-gradient-to-t from-brand-primary/15 to-brand-primary/70 transition-all hover:opacity-90"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("vendor.analytics.topProducts")}</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("vendor.orders.empty")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topProducts.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2"
                >
                  <span className="font-medium text-foreground">
                    {i + 1}. {p.title}
                  </span>
                  <span className="text-muted-foreground">${p.revenue.toFixed(0)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
