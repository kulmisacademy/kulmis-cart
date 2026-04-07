"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanDefinitionRow } from "@/lib/platform-db";

type StoreRow = {
  storeSlug: string;
  storeName: string;
  email: string;
  planSlug: string;
  planName: string;
  isVerified: boolean;
};

export function AdminStoresClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [plans, setPlans] = useState<PlanDefinitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    try {
      const [sRes, pRes] = await Promise.all([fetch("/api/admin/stores"), fetch("/api/admin/plans")]);
      if (sRes.ok) {
        const d = (await sRes.json()) as { stores?: StoreRow[] };
        if (d.stores) setStores(d.stores);
      }
      if (pRes.ok) {
        const d = (await pRes.json()) as { plans?: PlanDefinitionRow[] };
        if (d.plans) setPlans(d.plans);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patchStore(storeSlug: string, body: { isVerified?: boolean; planId?: string }) {
    setActing(storeSlug);
    try {
      const res = await fetch("/api/admin/stores", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, ...body }),
      });
      if (res.ok) await load();
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-medium">Store</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Verified</th>
            <th className="px-4 py-3 font-medium">Profile</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.storeSlug} className="border-b border-border/80">
              <td className="px-4 py-3">
                <div className="font-medium">{s.storeName}</div>
                <div className="font-mono text-xs text-muted-foreground">{s.storeSlug}</div>
              </td>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3">
                <select
                  className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                  value={plans.find((p) => p.slug === s.planSlug)?.id ?? plans[0]?.id ?? ""}
                  disabled={acting === s.storeSlug || plans.length === 0}
                  onChange={(e) => {
                    const planId = e.target.value;
                    if (planId) void patchStore(s.storeSlug, { planId });
                  }}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">{s.isVerified ? "Yes" : "No"}</td>
              <td className="px-4 py-3">
                <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
                  <Link href={`/admin/stores/${encodeURIComponent(s.storeSlug)}`}>
                    <Eye className="mr-1 size-4" aria-hidden />
                    View store
                  </Link>
                </Button>
              </td>
              <td className="px-4 py-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled={acting === s.storeSlug}
                  onClick={() => void patchStore(s.storeSlug, { isVerified: !s.isVerified })}
                >
                  {acting === s.storeSlug ? <Loader2 className="size-4 animate-spin" /> : s.isVerified ? "Remove badge" : "Verify"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
