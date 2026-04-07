import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { listPlanDefinitions } from "@/lib/platform-db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

/** Active subscription plans (prices & limits) for the logged-in vendor. */
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
  const plans = await listPlanDefinitions();
  return NextResponse.json({
    plans: plans.filter((p) => p.is_active),
  });
}
