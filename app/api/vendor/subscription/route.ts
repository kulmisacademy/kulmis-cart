import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { uiPlanFromEntitlements } from "@/lib/entitlements";
import { getEntitlementsForStore, listPlanDefinitions, setStorePlan } from "@/lib/platform-db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const bodySchema = z.object({
  planId: z.string().min(1),
});

/** Demo: assigns plan immediately. Production: use checkout + webhook. */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const plans = await listPlanDefinitions();
    const target = plans.find((p) => p.id === parsed.data.planId && p.is_active);
    if (!target) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }
    await setStorePlan(vendor.storeSlug, target.id);
    const ent = await getEntitlementsForStore(vendor.storeSlug);
    return NextResponse.json({
      ok: true,
      subscriptionPlan: uiPlanFromEntitlements(ent),
      entitlements: ent,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update subscription" }, { status: 503 });
  }
}
