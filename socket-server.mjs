/**
 * Realtime: chat threads + in-app notification rooms (`notify:<role>:<sub>`).
 * Internal HTTP (when SOCKET_BROADCAST_SECRET is set):
 *   POST /internal/chat-broadcast
 *   POST /internal/notify-broadcast
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";

const port = Number(process.env.SOCKET_PORT || 4001);
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.SOCKET_CORS_ORIGIN || "*" },
});

function threadRoom(conversationId) {
  return `thread:${conversationId}`;
}

function notifyRoom(role, sub) {
  return `notify:${role}:${sub}`;
}

/** Must match `lib/chat-socket-token.ts` / `lib/notify-socket-token.ts` getSecret(). */
function getTokenSecret() {
  return (
    process.env.SOCKET_TOKEN_SECRET?.trim() ||
    process.env.VENDOR_SESSION_SECRET?.trim() ||
    "dev-vendor-session-secret-change-me"
  );
}

function verifyChatSocketToken(raw, expectedThreadId, secret) {
  if (typeof raw !== "string" || !raw.includes(".")) return false;
  const dot = raw.lastIndexOf(".");
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!body || !sig) return false;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  try {
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.v !== 1 || payload.t !== expectedThreadId) return false;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return false;
    return true;
  } catch {
    return false;
  }
}

/** Align with `lib/notify-socket-token.ts` signNotifySocketToken payload. */
function verifyNotifySocketToken(raw, secret) {
  if (typeof raw !== "string" || !raw.includes(".")) return null;
  const dot = raw.lastIndexOf(".");
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.v !== 1 || typeof payload.role !== "string" || typeof payload.sub !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    if (!["customer", "vendor", "admin"].includes(payload.role)) return null;
    return { role: payload.role, sub: payload.sub };
  } catch {
    return null;
  }
}

function normalizeJoinPayload(payload) {
  if (typeof payload === "string" && payload.trim()) {
    return { threadId: payload.trim(), token: undefined };
  }
  if (payload && typeof payload === "object") {
    const threadId = typeof payload.threadId === "string" ? payload.threadId.trim() : "";
    const token = typeof payload.token === "string" ? payload.token : undefined;
    if (threadId) return { threadId, token };
  }
  return { threadId: "", token: undefined };
}

function joinConversationRoom(socket, conversationId) {
  if (typeof conversationId === "string" && conversationId) socket.join(threadRoom(conversationId));
}

function tryJoinThread(socket, payload) {
  const { threadId, token } = normalizeJoinPayload(payload);
  if (!threadId) return { ok: false, reason: "missing_thread_id" };
  const secret = getTokenSecret();
  if (!token || !verifyChatSocketToken(token, threadId, secret)) {
    return { ok: false, reason: "invalid_token" };
  }
  joinConversationRoom(socket, threadId);
  return { ok: true, threadId };
}

function broadcastToThread(ioInstance, threadId, message) {
  const room = threadRoom(threadId);
  ioInstance.to(room).emit("chat-message", message);
  ioInstance.to(room).emit("receiveMessage", message);
}

function socketIsInThread(socket, threadId) {
  if (typeof threadId !== "string" || !threadId) return false;
  return socket.rooms.has(threadRoom(threadId));
}

io.on("connection", (socket) => {
  socket.on("join", (payload, cb) => {
    const result = tryJoinThread(socket, payload);
    if (typeof cb === "function") cb(result);
  });
  socket.on("join-thread", (payload, cb) => {
    const result = tryJoinThread(socket, payload);
    if (typeof cb === "function") cb(result);
  });
  socket.on("join-conversation", (payload, cb) => {
    const result = tryJoinThread(socket, payload);
    if (typeof cb === "function") cb(result);
  });
  socket.on("join-notify", (payload, cb) => {
    const token = payload && typeof payload === "object" && typeof payload.token === "string" ? payload.token : "";
    const secret = getTokenSecret();
    const parsed = verifyNotifySocketToken(token, secret);
    if (!parsed) {
      if (typeof cb === "function") cb({ ok: false, reason: "invalid_token" });
      return;
    }
    const room = notifyRoom(parsed.role, parsed.sub);
    socket.join(room);
    if (typeof cb === "function") cb({ ok: true, room });
  });
  socket.on("send-message", (message) => {
    if (!message || typeof message !== "object") return;
    const threadId = message.threadId;
    if (typeof threadId !== "string" || !threadId) return;
    if (!socketIsInThread(socket, threadId)) return;
    broadcastToThread(io, threadId, message);
  });
  socket.on("sendMessage", (data) => {
    if (!data || typeof data !== "object") return;
    const conversationId = data.conversationId ?? data.threadId;
    if (typeof conversationId !== "string" || !conversationId) return;
    if (!socketIsInThread(socket, conversationId)) return;
    const message = data.threadId != null ? data : { ...data, threadId: conversationId };
    broadcastToThread(io, conversationId, message);
  });
});

const internalPort = Number(process.env.SOCKET_INTERNAL_PORT || 4002);
const broadcastSecret = (process.env.SOCKET_BROADCAST_SECRET || "").trim();

if (broadcastSecret) {
  const internalHttp = createServer((req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 404;
      res.end();
      return;
    }
    const url = req.url || "";
    if (url !== "/internal/chat-broadcast" && url !== "/internal/notify-broadcast") {
      res.statusCode = 404;
      res.end();
      return;
    }
    const hdr = req.headers["x-internal-secret"];
    const secret = Array.isArray(hdr) ? hdr[0] : hdr;
    if (secret !== broadcastSecret) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 1_000_000) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        if (url === "/internal/chat-broadcast") {
          const threadId = json.threadId;
          const message = json.message;
          if (typeof threadId !== "string" || !threadId || !message || typeof message !== "object") {
            res.statusCode = 400;
            res.end("bad request");
            return;
          }
          broadcastToThread(io, threadId, message);
        } else {
          const room = json.room;
          const payload = json.payload;
          if (typeof room !== "string" || !room || payload == null || typeof payload !== "object") {
            res.statusCode = 400;
            res.end("bad request");
            return;
          }
          io.to(room).emit("notification", payload);
        }
        res.statusCode = 200;
        res.end("ok");
      } catch {
        res.statusCode = 500;
        res.end("error");
      }
    });
  });
  internalHttp.listen(internalPort, () => {
    console.log(
      `[socket] Internal broadcast http://127.0.0.1:${internalPort}/internal/chat-broadcast & /internal/notify-broadcast`,
    );
  });
} else {
  console.warn("[socket] Set SOCKET_BROADCAST_SECRET for server-side chat + notification push.");
}

httpServer.listen(port, () => {
  console.log(`Socket.IO server listening on http://localhost:${port}`);
});
