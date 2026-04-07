import { NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeOtpCompare } from "@/lib/password-reset-otp";
import { findPendingResetForOtp, markPasswordResetVerified } from "@/lib/password-reset-repository";
import { signPasswordResetCompletionToken } from "@/lib/password-reset-token";

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["customer", "vendor"]),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

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
    return NextResponse.json({ error: "Invalid code or email" }, { status: 400 });
  }

  const emailNorm = parsed.data.email.trim().toLowerCase();
  const { role, otp } = parsed.data;

  try {
    const row = await findPendingResetForOtp({ emailNorm, role });
    if (!row || !timingSafeOtpCompare(emailNorm, otp, row.otp_hash)) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    await markPasswordResetVerified(row.id);
    const resetToken = signPasswordResetCompletionToken({
      resetRowId: row.id,
      emailNorm,
      role,
    });

    return NextResponse.json({ ok: true, resetToken });
  } catch (e) {
    console.error("verify-otp:", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 503 });
  }
}
