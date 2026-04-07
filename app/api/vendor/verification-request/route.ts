import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { createVerificationRequest, getPlatformSettings, getStoreVerified } from "@/lib/platform-db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

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
  const [settings, verified] = await Promise.all([
    getPlatformSettings(),
    getStoreVerified(vendor.storeSlug),
  ]);
  return NextResponse.json({
    verificationFeeCents: settings.verification_fee_cents,
    isVerified: verified,
  });
}

export async function POST() {
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const verified = await getStoreVerified(vendor.storeSlug);
  if (verified) {
    return NextResponse.json({ error: "Store is already verified" }, { status: 400 });
  }
  const result = await createVerificationRequest(vendor.storeSlug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
