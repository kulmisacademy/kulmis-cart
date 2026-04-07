import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getVendorSessionCookieName } from "@/lib/vendor-session";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const secure = sessionCookieSecure(request);
  cookieStore.set(getVendorSessionCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure,
  });
  return NextResponse.json({ ok: true });
}
