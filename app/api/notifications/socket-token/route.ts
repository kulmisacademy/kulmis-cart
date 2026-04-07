import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";
import { signNotifySocketToken } from "@/lib/notify-socket-token";
import type { AppNotificationAudience } from "@/lib/notifications/types";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function resolve(
  cookieStore: CookieStore,
  forParam: string | null,
): { role: AppNotificationAudience; sub: string } | { error: string; status: number } {
  const customer = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  const vendor = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  const admin = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);

  if (forParam === "vendor") {
    if (!vendor) return { error: "Unauthorized", status: 401 };
    return { role: "vendor", sub: vendor.vid };
  }
  if (forParam === "admin") {
    if (!admin) return { error: "Unauthorized", status: 401 };
    return { role: "admin", sub: "global" };
  }
  if (forParam === "customer") {
    if (!customer) return { error: "Unauthorized", status: 401 };
    return { role: "customer", sub: customer.cid };
  }

  if (vendor && !customer && !admin) return { role: "vendor", sub: vendor.vid };
  if (admin && !customer && !vendor) return { role: "admin", sub: "global" };
  if (customer && !vendor && !admin) return { role: "customer", sub: customer.cid };

  return {
    error: "Specify ?for=customer|vendor|admin when multiple sessions are active.",
    status: 400,
  };
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const { searchParams } = new URL(request.url);
  const r = resolve(cookieStore, searchParams.get("for"));
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const token = signNotifySocketToken(r.role, r.sub);
  return NextResponse.json({ token });
}
