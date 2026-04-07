import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorByEmail } from "@/lib/approved-vendors";
import { getCustomerSessionCookieName } from "@/lib/customer-session";
import {
  getVendorSessionCookieName,
  signVendorSession,
  vendorSessionCookieOptions,
} from "@/lib/vendor-session";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";

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

  try {
    const vendor = await findApprovedVendorByEmail(email);
    if (!vendor) {
      return NextResponse.json(
        { error: "No vendor account for this email. Register your store first, then sign in." },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, vendor.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
    const token = signVendorSession({
      vid: vendor.id,
      email: vendor.email,
      storeSlug: vendor.storeSlug,
      storeName: vendor.storeName,
      exp,
    });

    const cookieStore = await cookies();
    const secure = sessionCookieSecure(request);
    cookieStore.set(getCustomerSessionCookieName(), "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure,
    });
    cookieStore.set(getVendorSessionCookieName(), token, vendorSessionCookieOptions(SESSION_SEC, request));

    return NextResponse.json({
      ok: true,
      role: "vendor" as const,
      vendor: {
        id: vendor.id,
        email: vendor.email,
        storeSlug: vendor.storeSlug,
        storeName: vendor.storeName,
        plan: vendor.plan,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Something went wrong while signing in. Try again in a moment." },
      { status: 500 },
    );
  }
}
