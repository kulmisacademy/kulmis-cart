"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/locale-context";
import { useVendorDashboard } from "./vendor-dashboard-provider";
import { apiFetch, apiUrl } from "@/lib/api-client";
import { formatDateTimeEnUtc } from "@/lib/format-hydration-safe";

type ApiLine = {
  id: string;
  checkoutId: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerRegion: string;
  customerDistrict: string;
  productId: string;
  productTitle: string;
  productUrl: string;
  quantity: number;
  unitPrice: number | null;
  status: "pending" | "accepted" | "completed";
  storeName: string;
};

type GeneratedInvoice = { id: string; invoiceNo: string };

function waUrl(phone: string, body: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

/** Match by customer phone (digits), name, or checkout / line id. */
function orderLineMatchesQuery(o: ApiLine, raw: string): boolean {
  const q = raw.trim();
  if (!q) return true;
  const qLower = q.toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const phoneDigits = o.customerPhone.replace(/\D/g, "");
  if (qDigits.length > 0 && phoneDigits.includes(qDigits)) return true;
  if (o.customerName.toLowerCase().includes(qLower)) return true;
  const orderRef = (o.checkoutId ?? o.id).toLowerCase();
  if (orderRef.includes(qLower.replace(/\s/g, ""))) return true;
  return false;
}

export function VendorOrdersPage() {
  const { t } = useTranslations();
  const { state } = useVendorDashboard();
  const phone = state.settings.whatsAppNumber || state.settings.phone;

  const [lines, setLines] = useState<ApiLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoiceByOrderId, setInvoiceByOrderId] = useState<Record<string, GeneratedInvoice>>({});

  const filteredLines = useMemo(
    () => lines.filter((o) => orderLineMatchesQuery(o, searchQuery)),
    [lines, searchQuery],
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await apiFetch("/api/vendor/store-orders");
    const data = (await res.json()) as { orders?: ApiLine[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not load orders");
      setLines([]);
      return;
    }
    setLines(data.orders ?? []);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function updateStatus(orderLineId: string, status: ApiLine["status"]) {
    setPatching(orderLineId);
    try {
      const res = await apiFetch("/api/vendor/store-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderLineId, status }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Update failed");
        return;
      }
      await load();
    } finally {
      setPatching(null);
    }
  }

  async function generateInvoice(orderLineId: string) {
    setPatching(orderLineId);
    try {
      const res = await apiFetch("/api/vendor/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderLineId }),
      });
      const data = (await res.json()) as {
        error?: string;
        invoice?: { id: string; invoiceNo: string };
      };
      if (!res.ok || !data.invoice) {
        setError(data.error ?? "Could not generate invoice");
        return;
      }
      setInvoiceByOrderId((prev) => ({ ...prev, [orderLineId]: data.invoice! }));
    } finally {
      setPatching(null);
    }
  }

  const sections: { key: ApiLine["status"]; label: string }[] = [
    { key: "pending", label: t("vendor.orders.pending") },
    { key: "accepted", label: t("vendor.orders.accepted") },
    { key: "completed", label: t("vendor.orders.completed") },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.orders.title")}</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.orders.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("vendor.orders.subtitle")}</p>
        {lines.length > 0 ? (
          <div className="mt-4 max-w-md space-y-2">
            <Label htmlFor="vendor-orders-search" className="text-sm font-medium text-foreground">
              {t("vendor.orders.searchLabel")}
            </Label>
            <Input
              id="vendor-orders-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("vendor.orders.searchPlaceholder")}
              className="rounded-xl"
              autoComplete="off"
            />
          </div>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-border bg-muted/30">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{t("vendor.orders.empty")}</CardContent>
        </Card>
      ) : filteredLines.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-border bg-muted/30">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{t("vendor.orders.noSearchResults")}</CardContent>
        </Card>
      ) : (
        sections.map(({ key, label }) => {
          const list = filteredLines.filter((o) => o.status === key);
          if (list.length === 0) return null;
          return (
            <section key={key} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{label}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {list.map((o) => {
                  const lineTotal = (o.unitPrice ?? 0) * o.quantity;
                  const orderRef = o.checkoutId ?? o.id;
                  return (
                    <Card key={o.id} className="rounded-2xl border-border shadow-sm transition-shadow hover:shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{o.customerName}</CardTitle>
                            <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.customerRegion}, {o.customerDistrict}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDateTimeEnUtc(o.createdAt)}</p>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize text-foreground">
                            {o.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <ul className="space-y-1 text-muted-foreground">
                          <li>
                            {o.productTitle} × {o.quantity} — ${lineTotal.toFixed(2)}
                          </li>
                        </ul>
                        <p className="font-semibold text-foreground">
                          {t("vendor.orders.total")}: ${lineTotal.toFixed(2)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" className="rounded-xl" asChild>
                            <a
                              href={waUrl(phone, `${t("vendor.orders.message")} #${orderRef.slice(0, 8)}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gap-2"
                            >
                              <MessageCircle className="size-4" />
                              {t("vendor.orders.whatsapp")}
                            </a>
                          </Button>
                          {o.status === "pending" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-xl bg-brand-secondary text-black hover:bg-brand-secondary/90"
                              disabled={patching === o.id}
                              onClick={() => void updateStatus(o.id, "accepted")}
                            >
                              {t("vendor.orders.accept")}
                            </Button>
                          ) : null}
                          {o.status === "accepted" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-xl"
                              disabled={patching === o.id}
                              onClick={() => void updateStatus(o.id, "completed")}
                            >
                              {t("vendor.orders.complete")}
                            </Button>
                          ) : null}
                          {o.status === "accepted" || o.status === "completed" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={patching === o.id}
                              onClick={() => void generateInvoice(o.id)}
                            >
                              Generate Invoice
                            </Button>
                          ) : null}
                          {invoiceByOrderId[o.id] ? (
                            <Button type="button" variant="secondary" size="sm" className="rounded-xl" asChild>
                              <a href={apiUrl(`/api/vendor/invoices/${invoiceByOrderId[o.id]!.id}/pdf`)} target="_blank" rel="noreferrer">
                                Download PDF
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
