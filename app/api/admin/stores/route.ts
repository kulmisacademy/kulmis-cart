import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listApprovedVendors } from "@/lib/approved-vendors";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import {
  getEntitlementsForStore,
  getStoreVerified,
  setStorePlan,
  setStoreVerified,
} from "@/lib/platform-db";

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

const patchSchema = z.object({
  storeSlug: z.string().min(1),
  isVerified: z.boolean().optional(),
  planId: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { storeSlug, isVerified, planId } = parsed.data;
  try {
    if (typeof isVerified === "boolean") {
      await setStoreVerified(storeSlug, isVerified);
    }
    if (planId) {
      await setStorePlan(storeSlug, planId);
    }
    const ent = await getEntitlementsForStore(storeSlug);
    const verified = await getStoreVerified(storeSlug);
    return NextResponse.json({
      ok: true,
      store: { storeSlug, ...ent, isVerified: verified },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }
}
