"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpgradeRequestRow } from "@/lib/platform-db";
import { apiFetch } from "@/lib/api-client";

export function AdminUpgradeRequestsClient() {
  const [requests, setRequests] = useState<UpgradeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setMessage(null);
    try {
      const res = await apiFetch("/api/admin/upgrade-requests");
      const data = (await res.json()) as { requests?: UpgradeRequestRow[]; error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Failed to load.");
        return;
      }
      if (data.requests) setRequests(data.requests);
    } catch {
      setMessage("Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(requestId: string, action: "approve" | "reject") {
    setActing(requestId);
    setMessage(null);
    try {
      const res = await apiFetch("/api/admin/upgrade-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = (await res.json()) as { requests?: UpgradeRequestRow[]; error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Action failed.");
        return;
      }
      if (data.requests) setRequests(data.requests);
    } catch {
      setMessage("Network error.");
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
      {message ? (
        <p className="text-sm text-destructive" role="status">
          {message}
        </p>
      ) : null}
      {requests.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No upgrade requests yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border/80">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.store_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.store_slug}</div>
                  </td>
                  <td className="px-4 py-3">{r.plan_name}</td>
                  <td className="px-4 py-3">
                    <div>{r.phone}</div>
                    {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                    {r.message ? (
                      <div className="mt-1 max-w-xs text-xs text-muted-foreground">&ldquo;{r.message}&rdquo;</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{r.created_at}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg gap-1"
                          disabled={acting === r.id}
                          onClick={() => void act(r.id, "approve")}
                        >
                          {acting === r.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg gap-1"
                          disabled={acting === r.id}
                          onClick={() => void act(r.id, "reject")}
                        >
                          <X className="size-4" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {r.resolved_at ? `Resolved ${r.resolved_at}` : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
