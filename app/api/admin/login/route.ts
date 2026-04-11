import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { envAdminSessionIdentity, matchesEnvAdmin } from "@/lib/admin-env-login";
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
  /** Required when `ADMIN_ACCESS_KEY` is set in the environment. */
  accessKey: z.string().optional(),
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

  const { email, password, accessKey } = parsed.data;

  const expectedAccess = process.env.ADMIN_ACCESS_KEY?.trim();
  if (expectedAccess) {
    if (!accessKey || accessKey.trim() !== expectedAccess) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
  }

  const admin = await findAdminByEmail(email);

  let sessionPayload: { aid: string; email: string; exp: number } | null = null;

  if (admin) {
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
    sessionPayload = { aid: admin.id, email: admin.email, exp };
  } else if (matchesEnvAdmin(email, password)) {
    const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
    const { aid, email: envEmail } = envAdminSessionIdentity();
    sessionPayload = { aid, email: envEmail, exp };
  } else {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = signAdminSession(sessionPayload);

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
    admin: { id: sessionPayload.aid, email: sessionPayload.email },
  });
}
