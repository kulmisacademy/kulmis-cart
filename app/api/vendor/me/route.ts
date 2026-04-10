import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export async function GET(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/vendor/me`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (r.ok) {
        const body = (await r.json()) as { vendor?: unknown };
        return NextResponse.json(body);
      }
    } catch (e) {
      console.error("[vendor/me] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  try {
    const cookieStore = await cookies();
    const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
    if (!session) {
      return NextResponse.json({ vendor: null });
    }
    const vendor = await findApprovedVendorById(session.vid);
    if (!vendor) {
      return NextResponse.json({ vendor: null });
    }
    return NextResponse.json({
      vendor: {
        id: vendor.id,
        email: vendor.email,
        storeSlug: vendor.storeSlug,
        storeName: vendor.storeName,
        plan: vendor.plan,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ vendor: null, error: "unavailable" }, { status: 503 });
  }
}
