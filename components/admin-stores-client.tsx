"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

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
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const sRes = await apiFetch("/api/admin/stores");
      if (sRes.ok) {
        const d = (await sRes.json()) as { stores?: StoreRow[] };
        if (d.stores) setStores(d.stores);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Plan changes and verified badges are <strong>not</strong> edited here.{" "}
        <Link href="/admin/upgrades" className="font-medium text-brand-primary underline underline-offset-2">
          Upgrade requests
        </Link>{" "}
        and{" "}
        <Link href="/admin/verification" className="font-medium text-brand-primary underline underline-offset-2">
          Verification
        </Link>{" "}
        are the approval queues.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Profile</th>
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
                <td className="px-4 py-3">{s.planName}</td>
                <td className="px-4 py-3">{s.isVerified ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
                    <Link href={`/admin/stores/${encodeURIComponent(s.storeSlug)}`}>
                      <Eye className="mr-1 size-4" aria-hidden />
                      View store
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
