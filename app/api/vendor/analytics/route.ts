import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { getStoreViews, listVendorOrderLines } from "@/lib/customer/db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [orders, views] = await Promise.all([
    listVendorOrderLines(vendor.storeSlug),
    getStoreViews(vendor.storeSlug),
  ]);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + (o.unitPrice ?? 0) * o.quantity, 0);
  return NextResponse.json({ totalOrders, pendingOrders, completedOrders, totalRevenue, views });
}
