import { createHmac, timingSafeEqual } from "crypto";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";

export type VendorSessionPayload = {
  vid: string;
  email: string;
  storeSlug: string;
  storeName: string;
  exp: number;
};

const COOKIE_NAME = "kulmiscart-vendor-session";

function getSecret(): string {
  return process.env.VENDOR_SESSION_SECRET ?? "dev-vendor-session-secret-change-me";
}

export function getVendorSessionCookieName(): string {
  return COOKIE_NAME;
}

export function signVendorSession(payload: VendorSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyVendorSession(raw: string | undefined): VendorSessionPayload | null {
  if (!raw?.includes(".")) return null;
  const dot = raw.lastIndexOf(".");
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as VendorSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    if (!payload.vid || !payload.email || !payload.storeSlug) return null;
    return payload;
  } catch {
    return null;
  }
}

export function vendorSessionCookieOptions(expSec: number, request?: Request) {
  return {
    httpOnly: true,
    path: "/",
    maxAge: expSec,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(request),
  };
}
