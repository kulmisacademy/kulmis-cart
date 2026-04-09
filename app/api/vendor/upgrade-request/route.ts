import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { createUpgradeRequest } from "@/lib/platform-db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const bodySchema = z.object({
  planId: z.string().min(1),
  message: z.string().max(2000).optional(),
});

/** Submit a plan upgrade request (admin approves in dashboard). */
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

  const result = await createUpgradeRequest({
    vendorId: vendor.id,
    storeSlug: vendor.storeSlug,
    storeName: vendor.storeName,
    email: vendor.email,
    phone: vendor.storePhone,
    planId: parsed.data.planId,
    message: parsed.data.message,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
