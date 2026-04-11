import { getAdminDashboardStats } from "@/lib/admin-stats";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const card =
    "rounded-2xl border border-border bg-card p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of marketplace activity</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className={card}>
          <h3 className="text-sm font-medium text-muted-foreground">Total vendors</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{stats.totalVendors}</p>
        </div>
        <div className={card}>
          <h3 className="text-sm font-medium text-muted-foreground">Pending approvals</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-orange-500">{stats.pendingApprovals}</p>
        </div>
        <div className={card}>
          <h3 className="text-sm font-medium text-muted-foreground">Total orders</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{stats.totalOrders}</p>
        </div>
      </div>
    </div>
  );
}
