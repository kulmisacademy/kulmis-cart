"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deferRouterAction } from "@/lib/next-router-safe";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerOrderListItem, CustomerPublic } from "@/lib/customer/db";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { FEEDBACK_PRESETS } from "@/lib/feedback-presets";
import { CustomerMessagesSection } from "@/components/customer-messages-section";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { formatDateTimeEnUtc } from "@/lib/format-hydration-safe";

type Props = {
  customer: CustomerPublic;
  initialOrders: CustomerOrderListItem[];
};

function statusBadge(status: CustomerOrderListItem["status"]) {
  switch (status) {
    case "pending":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
    case "accepted":
      return "bg-sky-500/15 text-sky-900 dark:text-sky-200";
    case "completed":
      return "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function OrderFeedbackBlock({
  orderId,
  onDone,
}: {
  orderId: string;
  onDone: () => void;
}) {
  const [preset, setPreset] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!preset) {
      setErr("Choose one option.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch("/api/customer/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, presetOption: preset, comment }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Could not save feedback");
        return;
      }
      onDone();
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-foreground">How was this store?</p>
      <p className="mt-1 text-xs text-muted-foreground">Pick one option (required). Add a comment if you like.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {FEEDBACK_PRESETS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setPreset(label)}
            className={cn(
              "touch-manipulation rounded-full border px-3 py-1.5 text-left text-sm transition",
              preset === label
                ? "border-blue-600 bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100"
                : "border-border bg-background hover:bg-blue-50 dark:hover:bg-blue-950/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your comment (optional)"
        className="mt-3 min-h-[80px]"
        maxLength={2000}
      />
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      <Button type="button" size="sm" className="mt-3" disabled={busy || !preset} onClick={() => void submit()}>
        {busy ? "Sending…" : "Submit feedback"}
      </Button>
    </div>
  );
}

export function AccountOrdersClient({ customer, initialOrders }: Props) {
  const router = useRouter();
  const { refresh } = useCustomerAuth();
  const [orders, setOrders] = useState(initialOrders);

  const { checkoutGroups, legacyOrders } = useMemo(() => {
    const checkouts = new Map<string, CustomerOrderListItem[]>();
    const legacy: CustomerOrderListItem[] = [];
    for (const o of orders) {
      if (o.checkoutId) {
        const arr = checkouts.get(o.checkoutId) ?? [];
        arr.push(o);
        checkouts.set(o.checkoutId, arr);
      } else {
        legacy.push(o);
      }
    }
    const checkoutGroups = [...checkouts.entries()].map(([id, lines]) => ({
      checkoutId: id,
      lines: lines.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
    return { checkoutGroups, legacyOrders: legacy };
  }, [orders]);

  async function logout() {
    await apiFetch("/api/customer/logout", { method: "POST" });
    await refresh();
    router.push("/");
  }

  useEffect(() => {
    function scrollToHash() {
      const h = window.location.hash;
      if (h !== "#orders" && h !== "#messages") return;
      const id = h.slice(1);
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer.fullName} · {customer.email}
          </p>
          <p className="text-xs text-muted-foreground">
            {customer.region}, {customer.district} · {customer.phone}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void logout()}>
          Log out
        </Button>
      </div>

      <section id="orders" className="scroll-mt-28">
        <h2 className="text-lg font-semibold text-foreground">Orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pending, accepted, and completed orders you placed through checkout.
        </p>

        {orders.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link href="/products" className="font-semibold text-brand-primary hover:underline">
              Browse products
            </Link>
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {checkoutGroups.map(({ checkoutId, lines }) => {
              const first = lines[0]!;
              return (
                <li
                  key={checkoutId}
                  className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">Order</p>
                      <p className="text-xs text-muted-foreground">{formatDateTimeEnUtc(first.createdAt)}</p>
                      <Link
                        href={`/orders/${checkoutId}`}
                        className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline"
                      >
                        View order summary
                      </Link>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3 border-t border-border pt-4">
                    {lines.map((order) => (
                      <li key={order.id} className="text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {order.productTitle} × {order.quantity}
                            </p>
                            <p className="text-muted-foreground">{order.storeName}</p>
                            <Link
                              href={order.productUrl}
                              className="mt-1 inline-block text-xs text-brand-primary hover:underline"
                            >
                              Product link
                            </Link>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                              statusBadge(order.status),
                            )}
                          >
                            {order.status}
                          </span>
                        </div>
                        {order.status === "completed" && !order.hasFeedback ? (
                          <OrderFeedbackBlock
                            orderId={order.id}
                            onDone={() => {
                              setOrders((prev) =>
                                prev.map((o) => (o.id === order.id ? { ...o, hasFeedback: true } : o)),
                              );
                              deferRouterAction(() => router.refresh());
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}

            {legacyOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{order.productTitle}</p>
                    {order.quantity > 1 ? (
                      <p className="text-sm text-muted-foreground">Quantity × {order.quantity}</p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">{order.storeName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTimeEnUtc(order.createdAt)}
                    </p>
                    <Link
                      href={order.productUrl}
                      className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline"
                    >
                      Product link
                    </Link>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                      statusBadge(order.status),
                    )}
                  >
                    {order.status}
                  </span>
                </div>
                {order.status === "completed" && !order.hasFeedback ? (
                  <OrderFeedbackBlock
                    orderId={order.id}
                    onDone={() => {
                      setOrders((prev) =>
                        prev.map((o) => (o.id === order.id ? { ...o, hasFeedback: true } : o)),
                      );
                      deferRouterAction(() => router.refresh());
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <CustomerMessagesSection />
    </div>
  );
}
