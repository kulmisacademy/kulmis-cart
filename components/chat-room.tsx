"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, apiFetchSameOrigin } from "@/lib/api-client";

type Message = {
  id: string;
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  messageType: "text" | "product";
  messageText: string | null;
  productJson: string | null;
  createdAt: string;
};

export type ChatProductCard = {
  productId: string;
  name: string;
  price: number;
  image: string;
  link: string;
  /** Shown on shared product card (optional for older messages). */
  region?: string;
  storeName?: string;
};

/** Relay only after DB save (POST) + successful socket room join — server still requires sender to be in `thread:<id>`. */
function emitSocketRelay(socket: Socket | null, message: Message, joinOk: boolean) {
  if (!socket || !joinOk) return;
  socket.emit("send-message", message);
}

function mergeMessagesById(prev: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function attachSocketMessage(socket: Socket, threadId: string, append: (m: Message) => void) {
  const onMsg = (m: Message) => {
    if (m?.threadId === threadId) {
      append(m);
    }
  };
  socket.on("chat-message", onMsg);
  socket.on("receiveMessage", onMsg);
  return () => {
    socket.off("chat-message", onMsg);
    socket.off("receiveMessage", onMsg);
  };
}

/** One in-flight GET per thread across all ChatRoom instances (avoids duplicate polls). */
const messagesFetchByThread = new Map<string, Promise<Message[] | undefined>>();
/** Brief cache so React Strict Mode / double mount does not fire two slow GETs back-to-back. */
const recentMessagesByThread = new Map<string, { at: number; messages: Message[] }>();
/** Short client cache to coalesce Strict Mode / duplicate mounts without hiding new data for long. */
const RECENT_MESSAGES_TTL_MS = 2000;
/** Earliest time another background poll may start (set synchronously before await fetch — avoids bursts while a slow request is in flight). */
const nextMessagesPollAllowedAtByThread = new Map<string, number>();
const MIN_MESSAGES_POLL_GAP_MS = 6000;

type ThreadOpenResult = {
  threadId?: string;
  persistence?: "database" | "memory";
  error?: string;
};

/** Coalesce POST /api/chat/thread (React Strict Mode runs effects twice). */
const threadOpenByStoreSlug = new Map<string, Promise<ThreadOpenResult>>();

async function fetchCreateThread(storeSlug: string): Promise<ThreadOpenResult> {
  const existing = threadOpenByStoreSlug.get(storeSlug);
  if (existing) return existing;
  const p = (async (): Promise<ThreadOpenResult> => {
    const t = await apiFetchSameOrigin("/api/chat/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug }),
    });
    const data = (await t.json()) as ThreadOpenResult;
    if (!t.ok) {
      return {
        error:
          t.status === 401
            ? "Please login as customer to start chat."
            : data.error ?? "Login required to chat.",
      };
    }
    return data;
  })();
  threadOpenByStoreSlug.set(storeSlug, p);
  try {
    return await p;
  } finally {
    threadOpenByStoreSlug.delete(storeSlug);
  }
}

async function fetchThreadMessages(
  threadId: string,
  opts?: { force?: boolean },
): Promise<Message[] | undefined> {
  const force = opts?.force ?? false;
  const now = Date.now();
  if (!force) {
    const recent = recentMessagesByThread.get(threadId);
    if (recent && now - recent.at < RECENT_MESSAGES_TTL_MS) {
      return recent.messages;
    }
  }

  const existing = messagesFetchByThread.get(threadId);
  if (existing) return existing;

  if (!force) {
    const notBefore = nextMessagesPollAllowedAtByThread.get(threadId);
    if (notBefore != null && now < notBefore) return undefined;
  }

  // Reserve cooldown immediately so staggered timers cannot each start their own slow GET.
  nextMessagesPollAllowedAtByThread.set(threadId, now + MIN_MESSAGES_POLL_GAP_MS);

  const p = (async () => {
    try {
      const res = await apiFetch(`/api/chat/messages?threadId=${encodeURIComponent(threadId)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { messages?: Message[]; error?: string };
      if (!res.ok) return undefined;
      const messages = Array.isArray(data.messages) ? data.messages : [];
      recentMessagesByThread.set(threadId, { at: Date.now(), messages });
      return messages;
    } finally {
      // Defer delete so a Strict Mode remount can join the same in-flight request.
      const t = threadId;
      setTimeout(() => messagesFetchByThread.delete(t), 0);
    }
  })();

  messagesFetchByThread.set(threadId, p);
  return p;
}

function ProductChatCard({ p, mine }: { p: ChatProductCard; mine: boolean }) {
  const meta =
    p.region && p.storeName
      ? `${p.region} · ${p.storeName}`
      : p.storeName
        ? p.storeName
        : p.region
          ? p.region
          : null;

  return (
    <div
      className={cn(
        "w-full max-w-[min(100%,280px)] overflow-hidden rounded-2xl border border-border bg-white shadow-md transition-shadow hover:shadow-xl dark:bg-slate-900",
        mine && "ring-1 ring-white/30",
      )}
    >
      <div className="flex h-60 w-full items-center justify-center bg-gray-100 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- vendor product URLs */}
        <img
          src={p.image}
          alt={p.name}
          className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="space-y-2 p-4">
        {meta ? (
          <p className="text-xs text-blue-600 dark:text-blue-400">{meta}</p>
        ) : null}
        <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{p.name}</h3>
        <p className="text-base font-bold text-orange-500">${p.price.toFixed(2)}</p>
        <Link
          href={p.link}
          className="inline-block text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-sky-400"
        >
          View product
        </Link>
      </div>
    </div>
  );
}

export function ChatRoom({
  storeSlug,
  initialProduct,
  initialThreadId,
  viewerRole = "customer",
  variant = "page",
}: {
  storeSlug: string;
  initialProduct?: ChatProductCard;
  initialThreadId?: string;
  /** Who is looking at the thread — drives “my” bubble side. */
  viewerRole?: "customer" | "vendor";
  variant?: "page" | "popup";
}) {
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [persistence, setPersistence] = useState<"database" | "memory" | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  /** Set after socket server acks `join-thread` (same room as the other party). */
  const socketJoinOkRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), 128)}px`;
  }, [text]);

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    let detachSocket: (() => void) | undefined;
    let removeVisibility: (() => void) | undefined;

    void (async () => {
      try {
        let tj: ThreadOpenResult;
        if (initialThreadId) {
          tj = { threadId: initialThreadId, persistence: "database" };
        } else {
          tj = await fetchCreateThread(storeSlug);
        }
        if (!tj.threadId) {
          if ((tj.error ?? "").toLowerCase().includes("login")) setNeedsLogin(true);
          setError(tj.error ?? "Login required to chat.");
          setLoading(false);
          return;
        }
        if (stopped) return;
        setThreadId(tj.threadId);
        setPersistence(tj.persistence ?? "database");
        const tid = tj.threadId!;
        const pull = async (force = false) => {
          if (typeof document !== "undefined" && document.hidden && !force) return;
          const msgs = await fetchThreadMessages(tid, { force });
          if (msgs !== undefined) {
            setMessages((prev) => mergeMessagesById(prev, msgs));
          }
        };
        await pull(true);
        setLoading(false);

        if (socketUrl) {
          socketJoinOkRef.current = false;
          const s = io(socketUrl, { transports: ["websocket"] });
          socketRef.current = s;
          const tidSocket = tj.threadId!;
          const onSocketConnect = () => {
            socketJoinOkRef.current = false;
            void (async () => {
              let tok: string | undefined;
              try {
                const tr = await apiFetch(
                  `/api/chat/socket-token?threadId=${encodeURIComponent(tidSocket)}`,
                );
                if (tr.ok) {
                  const td = (await tr.json()) as { token?: string };
                  if (typeof td.token === "string") tok = td.token;
                }
              } catch {
                /* token fetch failed — join will fail until next reconnect */
              }
              s.emit("join-thread", { threadId: tidSocket, token: tok }, (ack: unknown) => {
                const ok =
                  Boolean(ack && typeof ack === "object" && "ok" in ack && (ack as { ok: boolean }).ok === true);
                socketJoinOkRef.current = ok;
              });
            })();
          };
          s.on("connect", onSocketConnect);
          if (s.connected) onSocketConnect();
          detachSocket = attachSocketMessage(s, tj.threadId, (m) => {
            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          });
        }

        // DB is source of truth: merge polls so a slow GET cannot wipe messages just appended after POST.
        // When Socket.IO is connected and joined, skip interval polling — rely on socket events; poll only as fallback.
        // Do not use pull(true) here: it bypasses MIN_MESSAGES_POLL_GAP and causes a GET storm when
        // alt-tabbing between customer and vendor windows (same threadId in server logs).
        const onVisible = () => {
          if (!document.hidden) void pull(false);
        };
        document.addEventListener("visibilitychange", onVisible);
        removeVisibility = () => document.removeEventListener("visibilitychange", onVisible);
        if (socketUrl) {
          timer = window.setInterval(() => {
            const s = socketRef.current;
            if (s?.connected && socketJoinOkRef.current) return;
            void pull(false);
          }, 45_000);
        } else {
          timer = window.setInterval(() => {
            void pull(false);
          }, 8000);
        }
      } catch {
        setError("Could not open chat. Refresh and try again.");
        setLoading(false);
      }
    })();
    return () => {
      stopped = true;
      socketJoinOkRef.current = false;
      if (timer) window.clearInterval(timer);
      removeVisibility?.();
      detachSocket?.();
      socketRef.current?.disconnect();
    };
  }, [initialThreadId, socketUrl, storeSlug]);

  async function sendText() {
    const val = text.trim();
    if (!val || !threadId || sendBusy) return;
    setSendBusy(true);
    setSendError(null);
    setText("");
    try {
      const res = await apiFetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, messageType: "text", messageText: val, contextRole: viewerRole }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: Message; error?: string };
      if (res.ok && data.message) {
        recentMessagesByThread.delete(threadId);
        setMessages((prev) => [...prev, data.message!]);
        emitSocketRelay(socketRef.current, data.message, socketJoinOkRef.current);
        return;
      }
      setText(val);
      setSendError(data.error ?? (res.status === 403 ? "Not allowed to send in this chat." : "Could not send. Try again."));
    } catch {
      setText(val);
      setSendError("Network error. Try again.");
    } finally {
      setSendBusy(false);
    }
  }

  async function sendProduct() {
    if (!threadId || !initialProduct || sendBusy) return;
    setSendBusy(true);
    setSendError(null);
    try {
      const res = await apiFetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          messageType: "product",
          product: initialProduct,
          contextRole: viewerRole,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: Message; error?: string };
      if (res.ok && data.message) {
        recentMessagesByThread.delete(threadId);
        setMessages((prev) => [...prev, data.message!]);
        emitSocketRelay(socketRef.current, data.message, socketJoinOkRef.current);
        return;
      }
      setSendError(data.error ?? (res.status === 403 ? "Not allowed to send in this chat." : "Could not send product card."));
    } catch {
      setSendError("Network error. Try again.");
    } finally {
      setSendBusy(false);
    }
  }

  const shellClass =
    variant === "popup"
      ? "flex h-full min-h-0 w-full flex-col rounded-none border-0 bg-transparent"
      : "flex min-h-[100dvh] flex-col rounded-none border-0 bg-background md:h-[72vh] md:rounded-2xl md:border md:border-border md:bg-card";

  if (loading) {
    return (
      <div className={cn("p-4", variant === "popup" && "h-full")}>
        <p className="text-sm text-muted-foreground">Opening chat…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-2 p-4">
        <p className="text-sm text-destructive">{error}</p>
        {needsLogin ? (
          <Link
            href={
              viewerRole === "vendor"
                ? `/auth?tab=store&next=${encodeURIComponent("/vendor/messages")}`
                : `/auth?tab=customer&next=${encodeURIComponent(`/chat/${storeSlug}`)}`
            }
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            Login to continue
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {persistence === "memory" ? (
        <p className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center text-[11px] text-amber-900 dark:text-amber-100">
          Fallback mode — messages may not persist if the server restarts.
        </p>
      ) : null}
      {sendError ? (
        <p className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive" role="alert">
          {sendError}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 [-webkit-overflow-scrolling:touch] sm:p-4">
        {sorted.map((m) => {
          const mine = viewerRole === "vendor" ? m.senderType === "vendor" : m.senderType === "customer";
          if (m.messageType === "product") {
            if (!m.productJson) return null;
            let p: ChatProductCard;
            try {
              p = JSON.parse(m.productJson) as ChatProductCard;
            } catch {
              return null;
            }
            return (
              <div key={m.id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                <ProductChatCard p={p} mine={mine} />
              </div>
            );
          }
          return (
            <div key={m.id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  mine
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-900 dark:bg-slate-700 dark:text-slate-100",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.messageText}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div
        className={cn(
          "flex shrink-0 items-end gap-2 border-t border-border bg-white p-3 dark:bg-slate-900",
          variant === "popup" &&
            "sticky bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:pb-3",
        )}
      >
        {initialProduct ? (
          <button
            type="button"
            title="Send product"
            disabled={sendBusy}
            onClick={() => void sendProduct()}
            className="mb-0.5 flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition hover:bg-gray-200 disabled:opacity-40 dark:hover:bg-slate-700"
          >
            <Paperclip className="size-5" aria-hidden />
            <span className="sr-only">Attach product</span>
          </button>
        ) : (
          <div className="size-10 shrink-0" aria-hidden />
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !sendBusy) {
              e.preventDefault();
              void sendText();
            }
          }}
          placeholder="Type your message..."
          className="min-h-[40px] max-h-32 min-w-0 flex-1 resize-none rounded-full border-0 bg-gray-100 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
        />

        <button
          type="button"
          onClick={() => void sendText()}
          disabled={!text.trim() || sendBusy}
          className="mb-0.5 flex h-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-blue-600 px-4 text-white transition hover:scale-105 hover:bg-blue-700 disabled:opacity-40 disabled:hover:scale-100"
          aria-label="Send message"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
