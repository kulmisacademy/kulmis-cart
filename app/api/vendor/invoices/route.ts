import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { listVendorInvoices } from "@/lib/customer/db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invoices = await listVendorInvoices(vendor.storeSlug);
  return NextResponse.json({ invoices });
}
