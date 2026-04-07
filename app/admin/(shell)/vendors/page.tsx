import { AdminPendingTable } from "@/components/admin-pending-table";
import { getPendingForAdmin } from "@/lib/vendor-approval";

export default async function AdminVendorsPage() {
  const pending = await getPendingForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and approve new store applications</p>
      </div>
      <AdminPendingTable pending={pending} />
    </div>
  );
}
