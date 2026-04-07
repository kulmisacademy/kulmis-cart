import "server-only";

/** Shape expected by `components/chat-room.tsx` for `chat-message` events. */
export type ChatSocketMessagePayload = {
  id: string;
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  messageType: "text" | "product";
  messageText: string | null;
  productJson: string | null;
  createdAt: string;
};

/**
 * After a message is persisted in Next.js, push it to Socket.IO from the server so the other party
 * receives it even when the sender's browser failed room join / relay (common cause: vendor not seeing customer).
 * Requires `SOCKET_BROADCAST_SECRET` and the socket process listening on `SOCKET_INTERNAL_BROADCAST_URL`.
 */
export function notifySocketThreadOfNewMessage(threadId: string, message: ChatSocketMessagePayload): void {
  const secret = process.env.SOCKET_BROADCAST_SECRET?.trim();
  const base = process.env.SOCKET_INTERNAL_BROADCAST_URL?.trim() || "http://127.0.0.1:4002";
  if (!secret) return;

  const url = `${base.replace(/\/$/, "")}/internal/chat-broadcast`;
  const body = JSON.stringify({
    threadId,
    message: {
      id: message.id,
      threadId: message.threadId,
      senderType: message.senderType,
      senderId: message.senderId,
      messageType: message.messageType,
      messageText: message.messageText,
      productJson: message.productJson,
      createdAt: message.createdAt,
    },
  });

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body,
    signal: AbortSignal.timeout(2500),
  }).catch(() => {});
}
