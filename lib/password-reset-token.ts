import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SEC = 60 * 15;

type PayloadV1 = {
  v: 1;
  rid: string;
  email: string;
  role: "customer" | "vendor";
  exp: number;
};

function getSecret(): string {
  return (
    process.env.PASSWORD_RESET_TOKEN_SECRET?.trim() ||
    process.env.VENDOR_SESSION_SECRET?.trim() ||
    "dev-password-reset-token-secret-change-me"
  );
}

export function signPasswordResetCompletionToken(input: {
  resetRowId: string;
  emailNorm: string;
  role: "customer" | "vendor";
}): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const payload: PayloadV1 = {
    v: 1,
    rid: input.resetRowId,
    email: input.emailNorm,
    role: input.role,
    exp,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPasswordResetCompletionToken(raw: string | undefined): PayloadV1 | null {
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PayloadV1;
    if (payload.v !== 1 || !payload.rid || !payload.email || (payload.role !== "customer" && payload.role !== "vendor")) {
      return null;
    }
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export const PASSWORD_RESET_COMPLETION_TTL_SEC = TOKEN_TTL_SEC;
