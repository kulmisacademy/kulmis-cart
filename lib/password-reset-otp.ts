import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

function otpPepper(): string {
  return (
    process.env.PASSWORD_RESET_OTP_PEPPER?.trim() ||
    process.env.VENDOR_SESSION_SECRET?.trim() ||
    "dev-password-reset-otp-pepper-change-me"
  );
}

export function hashOtpForStorage(emailNorm: string, otp: string): string {
  return createHmac("sha256", otpPepper()).update(`${emailNorm}:${otp}`).digest("hex");
}

export function timingSafeOtpCompare(emailNorm: string, plainOtp: string, storedHexHash: string): boolean {
  const a = hashOtpForStorage(emailNorm, plainOtp);
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(storedHexHash, "hex"));
  } catch {
    return false;
  }
}

export function generateSixDigitOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
