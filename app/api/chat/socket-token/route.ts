import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fallbackGetThread } from "@/lib/chat-fallback";
import { canCustomerAccessThread, canVendorAccessThread } from "@/lib/customer/db";
import { CHAT_SOCKET_TOKEN_TTL_SEC, signChatSocketToken } from "@/lib/chat-socket-token";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export async function GET(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const url = new URL(request.url);
      const q = url.searchParams.toString();
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/chat/socket-token${q ? `?${q}` : ""}`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (r.ok) {
        const body = await r.json();
        return NextResponse.json(body);
      }
    } catch (e) {
      console.error("[chat/socket-token] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId")?.trim() ?? "";
    if (!threadId) {
      return NextResponse.json({ error: "threadId required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const vendor = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
    const customer = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    if (!vendor && !customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbAvailable = Boolean(process.env.DATABASE_URL?.trim());
    /** Either role may access the thread (same as GET /api/chat/messages: customer session wins for messaging). */
    let allowed = false;

    if (dbAvailable) {
      try {
        if (customer) {
          allowed = await canCustomerAccessThread(threadId, customer.cid);
        }
        if (!allowed && vendor) {
          allowed = await canVendorAccessThread(threadId, vendor.storeSlug);
        }
      } catch {
        allowed = false;
      }
    }

    if (!allowed) {
      const ft = fallbackGetThread(threadId);
      if (customer && ft?.customerId === customer.cid) allowed = true;
      if (!allowed && vendor && ft?.storeSlug === vendor.storeSlug) allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const token = signChatSocketToken(threadId);
    return NextResponse.json({ token, expiresInSec: CHAT_SOCKET_TOKEN_TTL_SEC });
  } catch (e) {
    console.error("chat/socket-token:", e);
    return NextResponse.json({ error: "Socket token unavailable" }, { status: 503 });
  }
}
