import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findAdminById } from "@/lib/admins";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";

export async function GET(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/admin/me`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (r.ok) {
        const body = (await r.json()) as { admin?: unknown };
        return NextResponse.json(body);
      }
    } catch (e) {
      console.error("[admin/me] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  try {
    const cookieStore = await cookies();
    const session = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
    if (!session) {
      return NextResponse.json({ admin: null });
    }
    const admin = await findAdminById(session.aid);
    if (!admin) {
      return NextResponse.json({ admin: null });
    }
    return NextResponse.json({
      admin: { id: admin.id, email: admin.email },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ admin: null, error: "unavailable" }, { status: 503 });
  }
}
