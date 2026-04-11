import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Star, Users } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { getAdminStoreProfile } from "@/lib/admin-store-profile";
import { formatDateTimeEnUtc } from "@/lib/format-hydration-safe";
import { storeUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminStoreDetailPage({ params }: Props) {
  const { slug } = await params;
  const profile = await getAdminStoreProfile(slug);
  if (!profile) notFound();

  const { owner } = profile;
  const publicStoreUrl = storeUrl(owner.storeName, owner.vendorId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/stores" className="font-medium text-brand-primary hover:underline">
              ← Stores
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{owner.storeName}</h1>
            {profile.isVerified ? <VerifiedBadge size="lg" /> : null}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{owner.storeSlug}</p>
        </div>
        <a
          href={publicStoreUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted"
        >
          View live storefront
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Owner email</p>
          <p className="mt-1 text-sm font-medium text-foreground">{owner.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone / WhatsApp</p>
          <p className="mt-1 text-sm text-foreground">{owner.phone}</p>
          <p className="text-sm text-muted-foreground">{owner.whatsApp}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Region</p>
          <p className="mt-1 text-sm text-foreground">
            {owner.region} · {owner.district}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</p>
          <p className="mt-1 text-sm font-medium text-foreground">{profile.planName}</p>
          <p className="text-xs text-muted-foreground">{profile.planSlug}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Store description</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {profile.description || "— No description set —"}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Products</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{profile.productCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Star className="size-4 text-amber-500" aria-hidden />
            Rating (feedback)
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {profile.ratingCount > 0 ? profile.ratingAverage.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">{profile.ratingCount} reviews</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="size-4 text-red-500/80" aria-hidden />
            Followers
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{profile.followerCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">Products ({profile.productCount})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Region</th>
              </tr>
            </thead>
            <tbody>
              {profile.products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No products listed.
                  </td>
                </tr>
              ) : (
                profile.products.map((p) => (
                  <tr key={p.id} className="border-b border-border/80">
                    <td className="px-4 py-2 font-medium">{p.title}</td>
                    <td className="px-4 py-2 tabular-nums">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.region}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent orders ({profile.ordersTotal} total lines)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Checkout lines in Neon for this store. Requires DATABASE_URL.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {profile.orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No order lines yet (or database unavailable).
                  </td>
                </tr>
              ) : (
                profile.orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/80">
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDateTimeEnUtc(o.createdAt)}
                    </td>
                    <td className="px-4 py-2">{o.customerName}</td>
                    <td className="px-4 py-2 font-mono text-xs">{o.customerPhone}</td>
                    <td className="max-w-[200px] px-4 py-2">{o.productTitle}</td>
                    <td className="px-4 py-2 capitalize">{o.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Vendor ID (internal): <span className="font-mono">{owner.vendorId}</span>
      </p>
    </div>
  );
}
