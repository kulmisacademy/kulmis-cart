import "server-only";

/**
 * Push a structured notification to everyone in a Socket.IO room (e.g. notify:vendor:<id>).
 * Requires SOCKET_BROADCAST_SECRET and the socket process listening on SOCKET_INTERNAL_BROADCAST_URL.
 */
export function notifySocketNotificationRoom(room: string, payload: Record<string, unknown>): void {
  const secret = process.env.SOCKET_BROADCAST_SECRET?.trim();
  const base = process.env.SOCKET_INTERNAL_BROADCAST_URL?.trim() || "http://127.0.0.1:4002";
  if (!secret || !room.trim()) return;

  const url = `${base.replace(/\/$/, "")}/internal/notify-broadcast`;
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify({ room, payload }),
    signal: AbortSignal.timeout(2500),
  }).catch(() => {});
}
