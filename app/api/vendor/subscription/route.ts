import { NextResponse } from "next/server";

/**
 * Self-service plan changes are disabled. Vendors submit upgrade requests; admins approve in
 * `/admin/upgrades`. (Entitlements refresh after admin approval when the vendor reloads.)
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Plan changes require admin approval. Use Request upgrade on the subscription page.",
      code: "SELF_SERVICE_DISABLED",
    },
    { status: 403 },
  );
}
