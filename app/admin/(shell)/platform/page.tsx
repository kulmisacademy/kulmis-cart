import { AdminPlatformClient } from "@/components/admin-platform-client";

export default function AdminPlatformPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Platform &amp; plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verification fee and subscription plan limits (stored in Neon).
        </p>
      </div>
      <AdminPlatformClient />
    </div>
  );
}
