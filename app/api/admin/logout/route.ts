import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-session";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const name = getAdminSessionCookieName();
  const secure = sessionCookieSecure(request);
  const opts = {
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax" as const,
    secure,
  };
  cookieStore.set(name, "", { ...opts, path: "/" });
  cookieStore.set(name, "", { ...opts, path: "/admin" });
  return NextResponse.json({ ok: true });
}
