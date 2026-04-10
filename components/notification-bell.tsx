"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { cn } from "@/lib/utils";
import type { AppNotificationAudience, InAppNotificationRow } from "@/lib/notifications/types";
import { apiFetch } from "@/lib/api-client";

type Props = {
  forRole: AppNotificationAudience;
  className?: string;
};

const q = (role: AppNotificationAudience) => `for=${encodeURIComponent(role)}`;

export function NotificationBell({ forRole, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await apiFetch(`/api/notifications?${q(forRole)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { notifications?: InAppNotificationRow[]; unreadCount?: number };
    setItems(data.notifications ?? []);
    setUnread(data.unreadCount ?? 0);
  }, [forRole]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
    if (!socketUrl) return;
    let socket: Socket | null = null;
    let cancelled = false;
    void (async () => {
      const tRes = await apiFetch(`/api/notifications/socket-token?${q(forRole)}`);
      if (!tRes.ok || cancelled) return;
      const data = (await tRes.json()) as { token?: string };
      if (!data.token || cancelled) return;
      socket = io(socketUrl, { transports: ["websocket", "polling"] });
      socket.on("connect", () => {
        socket?.emit("join-notify", { token: data.token }, () => undefined);
      });
      socket.on("notification", () => {
        void refresh();
      });
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [forRole, refresh]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function onMarkRead(id: string) {
    await apiFetch(`/api/notifications?${q(forRole)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void refresh();
    router.refresh();
  }

  async function onMarkAll() {
    await apiFetch(`/api/notifications?${q(forRole)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true as const }),
    });
    void refresh();
    router.refresh();
  }

  return (
    <div className={cn("relative", className)} ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-brand-primary md:size-10 md:min-h-10 md:min-w-10"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-[1.1rem] md:size-[1.15rem]" aria-hidden />
        {unread > 0 ? (
          <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground md:h-4 md:min-w-4 md:text-[10px]">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-[100] mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-border bg-card py-2 text-card-foreground shadow-xl dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-border px-3 pb-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void onMarkAll()}
                className="text-xs font-medium text-brand-primary hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b border-border/80 last:border-0">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block px-3 py-2.5 text-left transition hover:bg-muted/80"
                      onClick={() => {
                        if (!n.isRead) void onMarkRead(n.id);
                        setOpen(false);
                      }}
                    >
                      <NotificationRow n={n} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full px-3 py-2.5 text-left transition hover:bg-muted/80"
                      onClick={() => {
                        if (!n.isRead) void onMarkRead(n.id);
                      }}
                    >
                      <NotificationRow n={n} />
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({ n }: { n: InAppNotificationRow }) {
  return (
    <>
      <p className="text-sm font-semibold text-foreground">
        {n.title}
        {!n.isRead ? (
          <span className="ml-1.5 inline-block size-1.5 rounded-full bg-brand-primary align-middle" aria-hidden />
        ) : null}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
      </p>
    </>
  );
}
