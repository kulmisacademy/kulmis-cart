import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findAdminByEmail } from "@/lib/admins";
import {
  adminSessionCookieOptions,
  getAdminSessionCookieName,
  signAdminSession,
} from "@/lib/admin-session";
import { getCustomerSessionCookieName } from "@/lib/customer-session";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";
import { getVendorSessionCookieName } from "@/lib/vendor-session";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SESSION_SEC = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const admin = await findAdminByEmail(email);
  if (!admin) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
  const token = signAdminSession({
    aid: admin.id,
    email: admin.email,
    exp,
  });

  const cookieStore = await cookies();
  const name = getAdminSessionCookieName();
  const secure = sessionCookieSecure(request);
  const clearCookie = (cookieName: string) =>
    cookieStore.set(cookieName, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure,
    });
  clearCookie(name);
  clearCookie(getCustomerSessionCookieName());
  clearCookie(getVendorSessionCookieName());
  cookieStore.set(name, token, adminSessionCookieOptions(SESSION_SEC, request));

  return NextResponse.json({
    ok: true,
    role: "admin" as const,
    admin: { id: admin.id, email: admin.email },
  });
}
