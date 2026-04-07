import "server-only";
import { createHmac } from "crypto";

/** Short-lived token for Socket.IO room join — must match verification in `socket-server.mjs`. */
export const CHAT_SOCKET_TOKEN_TTL_SEC = 300;

function getSecret(): string {
  return (
    process.env.SOCKET_TOKEN_SECRET?.trim() ||
    process.env.VENDOR_SESSION_SECRET?.trim() ||
    "dev-vendor-session-secret-change-me"
  );
}

export function signChatSocketToken(threadId: string): string {
  const exp = Math.floor(Date.now() / 1000) + CHAT_SOCKET_TOKEN_TTL_SEC;
  const payload = { v: 1 as const, t: threadId, exp };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
