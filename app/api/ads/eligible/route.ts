import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getEligibleAdsForCustomer, type PageTarget } from "@/lib/ads-db";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { getCustomerById } from "@/lib/customer/db";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const querySchema = z.object({
  page: z.enum(["home", "products", "store"]),
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    if (verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value)) {
      return NextResponse.json({ ads: [] });
    }
    if (verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
      return NextResponse.json({ ads: [] });
    }

    const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    if (!session) {
      return NextResponse.json({ ads: [] });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ page: searchParams.get("page") });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }
    const page = parsed.data.page as PageTarget;

    let customer;
    try {
      customer = await getCustomerById(session.cid);
    } catch {
      return NextResponse.json({ ads: [] });
    }
    if (!customer) {
      return NextResponse.json({ ads: [] });
    }

    const ads = await getEligibleAdsForCustomer(customer.id, customer.region, page);
    const origin = new URL(request.url).origin;

    return NextResponse.json({
      ads: ads.map((a) => {
        let imageUrl = a.imageUrl;
        const raw = imageUrl?.trim() ?? "";
        if (raw.startsWith("/")) {
          imageUrl = `${origin}${raw}`;
        }
        return {
          id: a.id,
          title: a.title,
          type: a.type,
          imageUrl,
          description: a.description,
          link: a.link,
          popupDelayMs: a.popupDelayMs,
        };
      }),
    });
  } catch (e) {
    console.error("ads eligible:", e);
    return NextResponse.json({ ads: [] });
  }
}
