import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  customerSessionCookieOptions,
  getCustomerSessionCookieName,
  signCustomerSession,
} from "@/lib/customer-session";
import { findApprovedVendorByEmail } from "@/lib/approved-vendors";
import { findCustomerByEmail } from "@/lib/customer/db";
import { getVendorSessionCookieName } from "@/lib/vendor-session";
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
  const emailLower = email.trim().toLowerCase();

  try {
    // Vendor accounts cannot have a customer row (see insertCustomer). Reject before DB so we
    // avoid a slow cold-start / ensureCustomerTables path when users pick the wrong tab.
    if (await findApprovedVendorByEmail(emailLower)) {
      return NextResponse.json(
        { error: "This email is registered as a vendor. Sign in at the Store tab on the sign-in page." },
        { status: 401 },
      );
    }

    const row = await findCustomerByEmail(email);
    if (!row) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
    const token = signCustomerSession({
      cid: row.id,
      email: row.email,
      exp,
    });
    const cookieStore = await cookies();
    const secure = sessionCookieSecure(request);
    cookieStore.set(getVendorSessionCookieName(), "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure,
    });
    cookieStore.set(getCustomerSessionCookieName(), token, customerSessionCookieOptions(SESSION_SEC, request));

    return NextResponse.json({
      ok: true,
      role: "customer" as const,
      customer: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        region: row.region,
        district: row.district,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
