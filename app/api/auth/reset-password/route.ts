import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorById, updateApprovedVendorPasswordHash } from "@/lib/approved-vendors";
import {
  customerSessionCookieOptions,
  getCustomerSessionCookieName,
  signCustomerSession,
} from "@/lib/customer-session";
import { getCustomerById, updateCustomerPasswordHash } from "@/lib/customer/db";
import { getVendorSessionCookieName, signVendorSession, vendorSessionCookieOptions } from "@/lib/vendor-session";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";
import {
  deletePasswordResetById,
  getVerifiedPasswordResetById,
} from "@/lib/password-reset-repository";
import { verifyPasswordResetCompletionToken } from "@/lib/password-reset-token";

const bodySchema = z.object({
  resetToken: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const SESSION_SEC = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.password?.[0] ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const payload = verifyPasswordResetCompletionToken(parsed.data.resetToken);
  if (!payload) {
    return NextResponse.json({ error: "Reset link expired. Start over from forgot password." }, { status: 400 });
  }

  try {
    const row = await getVerifiedPasswordResetById(payload.rid);
    if (!row || row.email.trim().toLowerCase() !== payload.email || row.role !== payload.role) {
      return NextResponse.json({ error: "Invalid or expired reset session." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const cookieStore = await cookies();
    const secure = sessionCookieSecure(request);

    if (row.role === "customer") {
      if (!row.customer_id) {
        return NextResponse.json({ error: "Invalid reset record." }, { status: 400 });
      }
      const ok = await updateCustomerPasswordHash(row.customer_id, passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Could not update password." }, { status: 500 });
      }
      await deletePasswordResetById(row.id);

      const customer = await getCustomerById(row.customer_id);
      if (!customer) {
        return NextResponse.json({ error: "Account not found." }, { status: 500 });
      }

      const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
      const token = signCustomerSession({
        cid: customer.id,
        email: customer.email,
        exp,
      });
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
        redirect: "/account",
      });
    }

    if (!row.vendor_id) {
      return NextResponse.json({ error: "Invalid reset record." }, { status: 400 });
    }
    const vendorOk = await updateApprovedVendorPasswordHash(row.vendor_id, passwordHash);
    if (!vendorOk) {
      return NextResponse.json({ error: "Could not update password." }, { status: 500 });
    }
    await deletePasswordResetById(row.id);

    const vendor = await findApprovedVendorById(row.vendor_id);
    if (!vendor) {
      return NextResponse.json({ error: "Store account not found." }, { status: 500 });
    }

    const exp = Math.floor(Date.now() / 1000) + SESSION_SEC;
    const vToken = signVendorSession({
      vid: vendor.id,
      email: vendor.email,
      storeSlug: vendor.storeSlug,
      storeName: vendor.storeName,
      exp,
    });
    cookieStore.set(getCustomerSessionCookieName(), "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure,
    });
    cookieStore.set(getVendorSessionCookieName(), vToken, vendorSessionCookieOptions(SESSION_SEC, request));

    return NextResponse.json({
      ok: true,
      role: "vendor" as const,
      redirect: "/vendor",
    });
  } catch (e) {
    console.error("reset-password:", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 503 });
  }
}
