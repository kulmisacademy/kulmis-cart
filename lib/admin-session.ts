import { createHmac, timingSafeEqual } from "crypto";
import { sessionCookieSecure } from "@/lib/session-cookie-secure";

export type AdminSessionPayload = {
  aid: string;
  email: string;
  exp: number;
};

const COOKIE_NAME = "kulmiscart-admin-session";

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.VENDOR_SESSION_SECRET ??
    "dev-admin-session-secret-change-me"
  );
}

export function getAdminSessionCookieName(): string {
  return COOKIE_NAME;
}

export function signAdminSession(payload: AdminSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAdminSession(raw: string | undefined): AdminSessionPayload | null {
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    if (!payload.aid || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export function adminSessionCookieOptions(expSec: number, request?: Request) {
  return {
    httpOnly: true,
    /** Must be `/` so the cookie is sent to `/api/admin/*` as well as `/admin/*` pages. */
    path: "/",
    maxAge: expSec,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(request),
  };
}
