import { AdminVerificationClient } from "@/components/admin-verification-client";

export default function AdminVerificationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paid store verification: mark payment received, then approve — or use waive for testing.
        </p>
      </div>
      <AdminVerificationClient />
    </div>
  );
}
