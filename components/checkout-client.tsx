"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { deferRouterAction } from "@/lib/next-router-safe";

export function CheckoutClient() {
  const router = useRouter();
  const { customer, loading: authLoading } = useCustomerAuth();
  const { lines, subtotal, clear, isReady } = useCart();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ checkoutId: string; links: { storeName: string; url: string }[] } | null>(
    null,
  );

  useEffect(() => {
    if (authLoading) return;
    if (!customer) {
      deferRouterAction(() =>
        router.replace(`/auth?tab=customer&next=${encodeURIComponent("/checkout")}`),
      );
      return;
    }
    setFullName(customer.fullName);
    setPhone(customer.phone);
    setRegion(customer.region);
    setDistrict(customer.district);
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (!isReady || authLoading || !customer) return;
    if (lines.length === 0 && !done) {
      deferRouterAction(() => {
        router.replace("/cart");
      });
    }
  }, [isReady, authLoading, customer, lines.length, router, done]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || submitting || lines.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          region: region.trim(),
          district: district.trim(),
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        checkoutId?: string;
        whatsappUrls?: { storeName: string; url: string }[];
      };
      if (!res.ok) {
        setError(data.error ?? "Could not place order");
        return;
      }
      if (data.checkoutId && data.whatsappUrls) {
        clear();
        setDone({
          checkoutId: data.checkoutId,
          links: data.whatsappUrls.map((w) => ({ storeName: w.storeName, url: w.url })),
        });
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !customer) {
    return (
      <PageScaffold>
        <SiteHeader />
        <main className="mx-auto flex min-h-[40vh] max-w-lg items-center justify-center px-4">
          <Loader2 className="size-8 animate-spin text-brand-primary" aria-hidden />
        </main>
        <SiteFooter />
      </PageScaffold>
    );
  }

  if (done) {
    return (
      <PageScaffold>
        <SiteHeader />
        <main className="mx-auto w-full min-w-0 max-w-lg px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-foreground">Order placed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your order was saved. We opened WhatsApp for each store so you can confirm with the seller.
          </p>
          <p className="mt-4 text-sm">
            <Link href={`/orders/${done.checkoutId}`} className="font-semibold text-brand-primary hover:underline">
              View order summary
            </Link>
          </p>
          <ul className="mt-6 space-y-3">
            {done.links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] px-4 py-3 text-sm font-semibold text-white hover:bg-[#009970]"
                >
                  <MessageCircle size={18} />
                  WhatsApp: {l.storeName}
                </a>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" className="mt-8 w-full" asChild>
            <Link href="/account">My orders</Link>
          </Button>
        </main>
        <SiteFooter />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-lg px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">Delivery details — then we will save your order and open WhatsApp.</p>

        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <p className="font-semibold text-foreground">Order total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">${subtotal.toFixed(2)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{lines.length} line item(s)</p>
        </div>

        <form suppressHydrationWarning className="mt-8 space-y-5" onSubmit={(e) => void onSubmit(e)}>
          {error ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} required />
          </div>
          <Button
            type="submit"
            disabled={submitting || lines.length === 0}
            className="h-12 w-full rounded-xl text-base font-semibold shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Placing order…
              </>
            ) : (
              "Place order"
            )}
          </Button>
        </form>
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
