import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getCustomerById } from "@/lib/customer/db";

export async function GET(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/customer/me`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (r.ok) {
        const body = (await r.json()) as { customer?: unknown };
        return NextResponse.json(body);
      }
    } catch (e) {
      console.error("[customer/me] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  try {
    const cookieStore = await cookies();
    const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    if (!session) {
      return NextResponse.json({ customer: null });
    }
    const customer = await getCustomerById(session.cid);
    return NextResponse.json({ customer });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ customer: null, error: "unavailable" }, { status: 503 });
  }
}
