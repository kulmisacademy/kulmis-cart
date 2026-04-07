import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCustomerSessionCookieName } from "@/lib/customer-session";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const secure = sessionCookieSecure(request);
  cookieStore.set(getCustomerSessionCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure,
  });
  return NextResponse.json({ ok: true });
}
