import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { getAiUsageToday, getEntitlementsForStore } from "@/lib/platform-db";
import { countProductVideos } from "@/lib/plan-limits";
import { loadDashboard } from "@/lib/vendor-dashboard-repository";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

/** Current usage vs plan caps for vendor dashboard (UTC day for AI). */
export async function GET() {
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [dash, ent, aiUsedToday] = await Promise.all([
    loadDashboard(vendor),
    getEntitlementsForStore(vendor.storeSlug),
    getAiUsageToday(vendor.storeSlug),
  ]);
  const productCount = dash.products.length;
  const videoCount = countProductVideos(dash.products);
  return NextResponse.json({
    productCount,
    videoCount,
    aiUsedToday,
    productLimit: ent.productLimit,
    videoLimit: ent.videoLimit,
    aiPerDay: ent.aiPerDay,
    aiEnabled: ent.aiEnabled,
  });
}
