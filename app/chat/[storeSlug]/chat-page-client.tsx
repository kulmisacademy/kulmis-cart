"use client";

import { useState } from "react";
import { ChatPopup } from "@/components/chat-popup";
import type { ChatProductCard } from "@/components/chat-room";
import { Button } from "@/components/ui/button";

export function ChatPageClient({
  storeSlug,
  storeName,
  initialProduct,
  threadId,
}: {
  storeSlug: string;
  storeName: string;
  initialProduct?: ChatProductCard;
  threadId?: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      {!open ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Chat closed.</p>
          <Button type="button" className="mt-4 rounded-xl" onClick={() => setOpen(true)}>
            Open chat again
          </Button>
        </div>
      ) : null}
      <ChatPopup
        open={open}
        onClose={() => setOpen(false)}
        storeSlug={storeSlug}
        storeName={storeName}
        initialProduct={initialProduct}
        initialThreadId={threadId}
      />
    </div>
  );
}
