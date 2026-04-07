import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerRegisterSchema } from "@/lib/customer-registration-schema";
import {
  customerSessionCookieOptions,
  getCustomerSessionCookieName,
  signCustomerSession,
} from "@/lib/customer-session";
import { insertCustomer } from "@/lib/customer/db";
import { getVendorSessionCookieName } from "@/lib/vendor-session";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";

const SESSION_SEC = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = customerRegisterSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { fullName, phone, email, password, region, district } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await insertCustomer({
      fullName,
      email,
      phone,
      passwordHash,
      region,
      district,
    });

    const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
    const token = signCustomerSession({
      cid: customer.id,
      email: customer.email,
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

    return NextResponse.json({ ok: true, role: "customer" as const, customer });
  } catch (e: unknown) {
    if ((e as Error & { code?: string })?.code === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not create account. Check database configuration." }, { status: 503 });
  }
}
