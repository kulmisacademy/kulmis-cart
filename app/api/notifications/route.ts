import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";
import {
  countUnreadNotifications,
  listInAppNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/inbox";
import type { AppNotificationAudience } from "@/lib/notifications/types";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function resolveRecipient(
  cookieStore: CookieStore,
  forParam: string | null,
):
  | { audience: AppNotificationAudience; recipientKey: string }
  | { error: string; status: number } {
  const customer = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  const vendor = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  const admin = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);

  if (forParam === "vendor") {
    if (!vendor) return { error: "Unauthorized", status: 401 };
    return { audience: "vendor", recipientKey: vendor.vid };
  }
  if (forParam === "admin") {
    if (!admin) return { error: "Unauthorized", status: 401 };
    return { audience: "admin", recipientKey: "global" };
  }
  if (forParam === "customer") {
    if (!customer) return { error: "Unauthorized", status: 401 };
    return { audience: "customer", recipientKey: customer.cid };
  }

  if (vendor && !customer && !admin) return { audience: "vendor", recipientKey: vendor.vid };
  if (admin && !customer && !vendor) return { audience: "admin", recipientKey: "global" };
  if (customer && !vendor && !admin) return { audience: "customer", recipientKey: customer.cid };

  return {
    error: "Specify ?for=customer|vendor|admin when multiple sessions are active.",
    status: 400,
  };
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const { searchParams } = new URL(request.url);
  const forParam = searchParams.get("for");

  const r = resolveRecipient(cookieStore, forParam);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const [notifications, unreadCount] = await Promise.all([
    listInAppNotifications(r.audience, r.recipientKey, 40),
    countUnreadNotifications(r.audience, r.recipientKey),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ markAll: z.literal(true) }),
]);

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const { searchParams } = new URL(request.url);
  const forParam = searchParams.get("for");
  const r = resolveRecipient(cookieStore, forParam);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    if ("markAll" in parsed.data) {
      await markAllNotificationsRead(r.audience, r.recipientKey);
    } else {
      const ok = await markNotificationRead(r.audience, r.recipientKey, parsed.data.id);
      if (!ok) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
