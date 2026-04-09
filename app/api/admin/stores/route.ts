import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listApprovedVendors } from "@/lib/approved-vendors";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { getEntitlementsForStore, getStoreVerified } from "@/lib/platform-db";

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vendors = await listApprovedVendors();
  const rows = await Promise.all(
    vendors.map(async (v) => {
      const [ent, verified] = await Promise.all([
        getEntitlementsForStore(v.storeSlug),
        getStoreVerified(v.storeSlug),
      ]);
      return {
        storeSlug: v.storeSlug,
        storeName: v.storeName,
        email: v.email,
        planSlug: ent.planSlug,
        planName: ent.planName,
        isVerified: verified,
      };
    }),
  );
  return NextResponse.json({ stores: rows });
}

/** Direct plan / verified toggles removed — use `/admin/upgrades` and `/admin/verification`. */
export async function PATCH() {
  return NextResponse.json(
    {
      error:
        "Direct plan assignment and verified toggles are disabled. Use Upgrade requests and Verification queues.",
      code: "USE_APPROVAL_QUEUES",
    },
    { status: 400 },
  );
}
