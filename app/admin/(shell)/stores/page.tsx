import { AdminStoresClient } from "@/components/admin-stores-client";

export default function AdminStoresControlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Stores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only plan and verification status — use Upgrade requests and Verification to approve changes. Open a
          store for full profile (products, orders, followers, ratings).
        </p>
      </div>
      <AdminStoresClient />
    </div>
  );
}
