"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { formatDateTimeEnUtc } from "@/lib/format-hydration-safe";

type Row = {
  checkoutId: string | null;
  orderLineId: string;
  phone: string;
  fullName: string;
  region: string;
  district: string;
  productTitle: string;
  storeName: string;
  status: string;
  createdAt: string;
};

export default function AdminOrdersPage() {
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (phoneSearch: string) => {
    setError(null);
    const q = new URLSearchParams();
    if (phoneSearch.trim()) q.set("phone", phoneSearch.trim());
    const res = await apiFetch(`/api/admin/orders?${q.toString()}`);
    const data = (await res.json()) as { orders?: Row[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setRows([]);
      return;
    }
    setRows(data.orders ?? []);
  }, []);

  useEffect(() => {
    void fetchOrders("").finally(() => setLoading(false));
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">Search customer orders by phone number.</p>
      </div>

      <form
        className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          void fetchOrders(phone).finally(() => setLoading(false));
        }}
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="admin-phone">Phone contains</Label>
          <Input
            id="admin-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="061…"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-brand-accent h-10 rounded-lg px-6 text-sm font-semibold">
          Search
        </button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Phone</th>
                <th className="px-3 py-2 font-semibold">Customer</th>
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-3 py-2 font-semibold">Store</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.orderLineId} className="border-b border-border/80">
                  <td className="px-3 py-2 text-muted-foreground">{formatDateTimeEnUtc(r.createdAt)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-3 py-2">
                    {r.fullName}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {r.region} / {r.district}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">{r.productTitle}</td>
                  <td className="px-3 py-2">{r.storeName}</td>
                  <td className="px-3 py-2 capitalize">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">No orders found.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
