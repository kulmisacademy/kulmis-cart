import { redirect } from "next/navigation";
import { AccountOrdersClient } from "@/components/account-orders-client";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listCustomerOrders } from "@/lib/customer/db";
import { getCustomerFromCookies } from "@/lib/customer/server-auth";

export default async function AccountPage() {
  let customer;
  try {
    customer = await getCustomerFromCookies();
  } catch {
    return (
      <PageScaffold>
        <SiteHeader />
        <main className="mx-auto max-w-brand px-4 py-10 sm:px-6">
          <p className="text-sm text-foreground">
            We could not reach the database. Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">DATABASE_URL</code> in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> and try again.
          </p>
        </main>
        <SiteFooter />
      </PageScaffold>
    );
  }

  if (!customer) {
    redirect(`/auth?tab=customer&next=${encodeURIComponent("/account")}`);
  }

  let orders: Awaited<ReturnType<typeof listCustomerOrders>> = [];
  try {
    orders = await listCustomerOrders(customer.id, 100);
  } catch {
    orders = [];
  }

  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-brand px-4 py-10 sm:px-6">
        <AccountOrdersClient customer={customer} initialOrders={orders} />
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
