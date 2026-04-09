"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { countProductVideos } from "@/lib/plan-limits";
import type { PlanDefinitionRow } from "@/lib/platform-db";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/locale-context";
import { useVendorDashboard } from "./vendor-dashboard-provider";

function UsageRow({
  label,
  used,
  cap,
}: {
  label: string;
  used: number;
  cap: number | null;
}) {
  const denom = cap != null ? cap : null;
  const pct = denom != null && denom > 0 ? Math.min(100, (used / denom) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">
          {used}
          {denom != null ? ` / ${denom}` : " / ∞"}
        </span>
      </div>
      {denom != null ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-2 w-full rounded-full bg-muted/80" title="Unlimited" />
      )}
    </div>
  );
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type UsagePayload = {
  productCount: number;
  videoCount: number;
  aiUsedToday: number;
  productLimit: number | null;
  videoLimit: number | null;
  aiPerDay: number | null;
  aiEnabled: boolean;
};

export function VendorSubscriptionPage() {
  const { t } = useTranslations();
  const { state, entitlements, saving, refreshDashboard } = useVendorDashboard();
  const [plans, setPlans] = useState<PlanDefinitionRow[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/vendor/plans");
        const data = (await res.json()) as { plans?: PlanDefinitionRow[] };
        if (!cancelled && data.plans) setPlans(data.plans);
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/vendor/usage");
        const data = (await res.json()) as UsagePayload & { error?: string };
        if (!cancelled && !data.error) setUsage(data);
      } catch {
        if (!cancelled) setUsage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.products, entitlements.planSlug]);

  const videoCount = countProductVideos(state.products);
  const productCount = state.products.length;

  async function selectPlan(planId: string) {
    setBanner(null);
    setUpgrading(planId);
    try {
      const res = await fetch("/api/vendor/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBanner(data.error ?? "Could not change plan.");
        return;
      }
      await refreshDashboard();
      try {
        const uRes = await fetch("/api/vendor/usage");
        const u = (await uRes.json()) as UsagePayload & { error?: string };
        if (uRes.ok && !u.error) setUsage(u);
      } catch {
        /* ignore */
      }
      setBanner(null);
    } catch {
      setBanner("Network error.");
    } finally {
      setUpgrading(null);
    }
  }

  const currentPlanId =
    plans.find((p) => p.slug === entitlements.planSlug)?.id ??
    (entitlements.planSlug === "free"
      ? "plan_free"
      : entitlements.planSlug === "pro"
        ? "plan_pro"
        : "plan_premium");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("vendor.subscription.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("vendor.subscription.current")}:{" "}
          <span className="font-semibold text-foreground">{entitlements.planName}</span>
        </p>
        <div className="mt-3 space-y-4 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Usage</p>
          <UsageRow
            label="Products"
            used={usage?.productCount ?? productCount}
            cap={usage?.productLimit ?? entitlements.productLimit}
          />
          <UsageRow
            label="Videos (with video)"
            used={usage?.videoCount ?? videoCount}
            cap={usage?.videoLimit ?? entitlements.videoLimit}
          />
          {entitlements.aiEnabled ? (
            <UsageRow
              label="AI assists today (UTC)"
              used={usage?.aiUsedToday ?? 0}
              cap={usage?.aiPerDay ?? entitlements.aiPerDay}
            />
          ) : (
            <p className="text-xs text-muted-foreground">AI listing assist is not included in your plan.</p>
          )}
        </div>
      </div>

      {banner ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {banner}
        </div>
      ) : null}

      {loadingPlans ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading plans…
        </div>
      ) : plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Subscription plans are unavailable. Ensure <code className="rounded bg-muted px-1">DATABASE_URL</code> is set
          and migrations have run.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.id === currentPlanId;
            const isPro = p.slug === "pro";
            return (
              <Card
                key={p.id}
                className={cn(
                  "rounded-2xl border-2 shadow-sm transition-all duration-300 hover:scale-[1.02]",
                  isCurrent ? "border-brand-primary ring-2 ring-brand-primary/20" : "border-border",
                  isPro && !isCurrent ? "md:ring-2 md:ring-brand-secondary/30" : "",
                )}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{formatUsd(p.price_monthly_cents)}</p>
                  <p className="text-xs text-muted-foreground">per month (demo — connect billing for production)</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-brand-secondary" /> Products:{" "}
                    {p.product_limit == null ? "Unlimited" : `Max ${p.product_limit}`}
                  </p>
                  <p className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-brand-secondary" /> Videos:{" "}
                    {p.video_limit == null ? "Unlimited" : `Max ${p.video_limit} (with video)`}
                  </p>
                  <p className="flex items-center gap-2">
                    {p.ai_enabled ? (
                      <Check className="size-4 shrink-0 text-brand-secondary" />
                    ) : (
                      <span className="size-4 text-center text-muted-foreground">—</span>
                    )}
                    AI listing assist{" "}
                    {p.ai_enabled
                      ? p.ai_per_day == null
                        ? "(unlimited / day)"
                        : `(max ${p.ai_per_day} / day)`
                      : "(not included)"}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    type="button"
                    className="w-full rounded-xl"
                    variant={isCurrent ? "secondary" : "default"}
                    disabled={isCurrent || saving || upgrading !== null}
                    onClick={() => void selectPlan(p.id)}
                  >
                    {upgrading === p.id ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Updating…
                      </>
                    ) : isCurrent ? (
                      "Current plan"
                    ) : (
                      t("vendor.subscription.upgrade")
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
