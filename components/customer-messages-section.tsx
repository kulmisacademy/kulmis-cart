"use client";

import { useEffect, useState } from "react";
import { ChatPopup } from "@/components/chat-popup";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatDateTimeEnUtc } from "@/lib/format-hydration-safe";

type Thread = {
  id: string;
  customerName: string;
  storeSlug: string;
  storeName?: string;
  updatedAt: string;
  lastMessage: string | null;
};

export function CustomerMessagesSection() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [chat, setChat] = useState<{ threadId: string; storeSlug: string; storeName: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/chat/threads?role=customer");
      const data = (await res.json().catch(() => ({}))) as { threads?: Thread[] };
      if (res.ok && data.threads) setThreads(data.threads);
    })();
  }, []);

  return (
    <section id="messages" className="scroll-mt-28">
      <h2 className="text-lg font-semibold text-foreground">Messages</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Continue conversations you started from product pages — real-time in-app chat with sellers.
      </p>
      {threads.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No messages yet. Open <span className="font-medium text-foreground">Chat with Seller</span> on any product.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {threads.map((t) => (
            <li key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.storeName ?? t.storeSlug}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.lastMessage ?? "No messages yet"}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTimeEnUtc(t.updatedAt)}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg"
                  onClick={() =>
                    setChat({
                      threadId: t.id,
                      storeSlug: t.storeSlug,
                      storeName: t.storeName ?? t.storeSlug,
                    })
                  }
                >
                  Open chat
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ChatPopup
        open={chat != null}
        onClose={() => setChat(null)}
        storeSlug={chat?.storeSlug ?? ""}
        storeName={chat?.storeName ?? ""}
        initialThreadId={chat?.threadId}
      />
    </section>
  );
}
