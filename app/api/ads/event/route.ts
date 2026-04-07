import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdById, recordAdEvent } from "@/lib/ads-db";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { getCustomerById } from "@/lib/customer/db";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const bodySchema = z.object({
  adId: z.string().min(1),
  type: z.enum(["view", "click"]),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value)) {
      return NextResponse.json({ ok: true });
    }
    if (verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
      return NextResponse.json({ ok: true });
    }

    const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    if (!session) {
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

    const customer = await getCustomerById(session.cid);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ad = await getAdById(parsed.data.adId);
    if (!ad || !ad.isActive) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await recordAdEvent(parsed.data.adId, customer.id, parsed.data.type);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ads event:", e);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
