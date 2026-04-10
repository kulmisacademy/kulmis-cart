"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deferRouterAction } from "@/lib/next-router-safe";
import { approvePendingVendorAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PendingVendorRecord } from "@/lib/pending-vendors";

type Props = { pending: PendingVendorRecord[] };

export function AdminPendingTable({ pending }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function approve(id: string) {
    setBusyId(id);
    setMsg("");
    try {
      const result = await approvePendingVendorAction(id);
      if (!result.ok) {
        setMsg(result.error);
        return;
      }
      deferRouterAction(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed border-border">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No pending vendor applications.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {msg}
        </p>
      ) : null}
      <div className="space-y-3">
        {pending.map((p) => (
          <Card key={p.id} className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.storeName}</CardTitle>
              <p className="text-sm text-muted-foreground">{p.email}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {p.region} / {p.district}
              </span>
              <span className="font-mono text-xs">{p.storePhone}</span>
              <Button
                type="button"
                size="sm"
                className="ml-auto rounded-xl bg-brand-secondary text-black hover:bg-brand-secondary/90"
                disabled={busyId === p.id}
                onClick={() => void approve(p.id)}
              >
                {busyId === p.id ? "Approving..." : "Approve"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
