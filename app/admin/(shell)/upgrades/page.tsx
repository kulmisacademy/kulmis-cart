import { AdminUpgradeRequestsClient } from "@/components/admin-upgrade-requests-client";

export default function AdminUpgradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Upgrade requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve or reject plan-change requests from vendors. Approved requests apply the selected plan immediately.
        </p>
      </div>
      <AdminUpgradeRequestsClient />
    </div>
  );
}
