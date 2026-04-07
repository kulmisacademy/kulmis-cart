import "server-only";
import { createHmac } from "crypto";

/** Longer TTL than chat thread tokens — bell stays subscribed while dashboard is open. */
export const NOTIFY_SOCKET_TOKEN_TTL_SEC = 3600;

function getSecret(): string {
  return (
    process.env.SOCKET_TOKEN_SECRET?.trim() ||
    process.env.VENDOR_SESSION_SECRET?.trim() ||
    "dev-vendor-session-secret-change-me"
  );
}

export type NotifySocketRole = "customer" | "vendor" | "admin";

export function signNotifySocketToken(role: NotifySocketRole, sub: string): string {
  const exp = Math.floor(Date.now() / 1000) + NOTIFY_SOCKET_TOKEN_TTL_SEC;
  const payload = { v: 1 as const, role, sub, exp };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
