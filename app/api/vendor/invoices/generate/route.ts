import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { createInvoiceForOrderLine } from "@/lib/customer/db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const bodySchema = z.object({
  orderLineId: z.string().min(1),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const invoice = await createInvoiceForOrderLine(vendor.storeSlug, parsed.data.orderLineId);
    if (!invoice) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not generate invoice" }, { status: 503 });
  }
}
