"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerificationRequestRow } from "@/lib/platform-db";
import { apiFetch } from "@/lib/api-client";

export function AdminVerificationClient() {
  const [rows, setRows] = useState<VerificationRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await apiFetch("/api/admin/verification");
      const data = (await res.json()) as { requests?: VerificationRequestRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      if (data.requests) setRows(data.requests);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runAction(requestId: string, action: "markPaid" | "approve" | "reject" | "waiveApprove") {
    setActing(requestId + action);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = (await res.json()) as { requests?: VerificationRequestRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      if (data.requests) setRows(data.requests);
    } catch {
      setError("Network error");
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
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No verification requests yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const busy = acting !== null && acting.startsWith(r.id);
                const pending = r.status === "pending";
                return (
                  <tr key={r.id} className="border-b border-border/80">
                    <td className="px-4 py-3 font-mono text-xs">{r.store_slug}</td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3">{r.payment_status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.created_at}</td>
                    <td className="px-4 py-3">
                      {pending ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            disabled={busy}
                            onClick={() => void runAction(r.id, "markPaid")}
                          >
                            {acting === r.id + "markPaid" ? <Loader2 className="size-4 animate-spin" /> : "Mark paid"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg"
                            disabled={busy || r.payment_status === "unpaid"}
                            onClick={() => void runAction(r.id, "approve")}
                          >
                            {acting === r.id + "approve" ? <Loader2 className="size-4 animate-spin" /> : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="rounded-lg"
                            disabled={busy}
                            onClick={() => void runAction(r.id, "waiveApprove")}
                          >
                            {acting === r.id + "waiveApprove" ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Waive & approve"
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="rounded-lg"
                            disabled={busy}
                            onClick={() => void runAction(r.id, "reject")}
                          >
                            {acting === r.id + "reject" ? <Loader2 className="size-4 animate-spin" /> : "Reject"}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
