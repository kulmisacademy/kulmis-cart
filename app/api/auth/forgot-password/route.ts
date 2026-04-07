import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorByEmail } from "@/lib/approved-vendors";
import { findCustomerByEmail } from "@/lib/customer/db";
import { isMailConfigured, sendPasswordResetOtpEmail } from "@/lib/mailer";
import { generateSixDigitOtp, hashOtpForStorage } from "@/lib/password-reset-otp";
import { createPasswordResetRequest } from "@/lib/password-reset-repository";

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["customer", "vendor"]),
});

const GENERIC_OK = {
  ok: true as const,
  message: "If an account exists for that email, we sent a verification code.",
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Password reset is unavailable (database not configured)." }, { status: 503 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Password reset email is not configured. Set SMTP_USER and SMTP_PASS in the environment." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const emailNorm = parsed.data.email.trim().toLowerCase();
  const { role } = parsed.data;

  try {
    if (role === "customer") {
      if (await findApprovedVendorByEmail(emailNorm)) {
        return NextResponse.json(GENERIC_OK);
      }
      const row = await findCustomerByEmail(emailNorm);
      if (!row) {
        return NextResponse.json(GENERIC_OK);
      }
      const otp = generateSixDigitOtp();
      const otpHash = hashOtpForStorage(emailNorm, otp);
      await createPasswordResetRequest({
        emailNorm,
        role: "customer",
        customerId: row.id,
        vendorId: null,
        otpHash,
      });
      await sendPasswordResetOtpEmail(row.email, otp);
      return NextResponse.json(GENERIC_OK);
    }

    const vendor = await findApprovedVendorByEmail(emailNorm);
    if (!vendor) {
      return NextResponse.json(GENERIC_OK);
    }
    const otp = generateSixDigitOtp();
    const otpHash = hashOtpForStorage(emailNorm, otp);
    await createPasswordResetRequest({
      emailNorm,
      role: "vendor",
      customerId: null,
      vendorId: vendor.id,
      otpHash,
    });
    await sendPasswordResetOtpEmail(vendor.email, otp);
    return NextResponse.json(GENERIC_OK);
  } catch (e) {
    console.error("forgot-password:", e);
    return NextResponse.json({ error: "Could not process request. Try again later." }, { status: 503 });
  }
}
