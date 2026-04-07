import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCheckoutDetailForCustomer } from "@/lib/customer/db";
import { getCustomerFromCookies } from "@/lib/customer/server-auth";

type Props = { params: Promise<{ id: string }> };

export default async function OrderSummaryPage({ params }: Props) {
  const { id } = await params;
  let customer;
  try {
    customer = await getCustomerFromCookies();
  } catch {
    notFound();
  }
  if (!customer) {
    redirect(`/auth?tab=customer&next=${encodeURIComponent(`/orders/${id}`)}`);
  }

  const detail = await getCheckoutDetailForCustomer(id, customer.id);
  if (!detail) {
    notFound();
  }

  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-lg px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Order</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.fullName} · {detail.phone}
        </p>
        <p className="text-sm text-muted-foreground">
          {detail.region} / {detail.district}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Placed {new Date(detail.createdAt).toLocaleString()}
        </p>

        <ul className="mt-8 space-y-3">
          {detail.lines.map((line) => (
            <li key={line.id} className="rounded-xl border border-border bg-card p-4 text-card-foreground">
              <p className="font-semibold text-foreground">{line.productTitle}</p>
              <p className="text-xs text-muted-foreground">{line.storeName}</p>
              <p className="mt-2 text-sm tabular-nums">
                ${(line.unitPrice ?? 0).toFixed(2)} × {line.quantity}
              </p>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                  line.status === "completed"
                    ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                    : line.status === "accepted"
                      ? "bg-sky-500/15 text-sky-900 dark:text-sky-200"
                      : "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                }`}
              >
                {line.status}
              </span>
            </li>
          ))}
        </ul>

        <Link href="/account" className="mt-8 inline-block text-sm font-semibold text-brand-primary hover:underline">
          Back to my account
        </Link>
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
