import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import {
  getFollowerCountForStore,
  getStoreViews,
  getStoreRatingSummaries,
  listVendorOrderLines,
  listFeedbackForVendorStore,
} from "@/lib/customer/db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getVendorSessionCookieName())?.value;
  const session = verifyVendorSession(raw);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = vendor.storeSlug;
  try {
    const [followers, views, summaries, orderLines] = await Promise.all([
      getFollowerCountForStore(slug),
      getStoreViews(slug),
      getStoreRatingSummaries([slug]),
      listVendorOrderLines(slug),
    ]);
    const s = summaries[slug];
    const avgRating = s?.average ?? 0;
    const reviewCount = s?.count ?? 0;
    const feedback = await listFeedbackForVendorStore(slug, 20);
    const totalOrders = orderLines.length;
    const pendingOrders = orderLines.filter((o) => o.status === "pending").length;
    const completedOrders = orderLines.filter((o) => o.status === "completed").length;
    const totalRevenue = orderLines
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + (o.unitPrice ?? 0) * o.quantity, 0);
    return NextResponse.json({
      followers,
      views,
      avgRating,
      reviewCount,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      feedback,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load insights" }, { status: 503 });
  }
}
