"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatRoom, type ChatProductCard } from "@/components/chat-room";
import { cn } from "@/lib/utils";

export function ChatPopup({
  open,
  onClose,
  storeSlug,
  storeName,
  initialProduct,
  initialThreadId,
  viewerRole = "customer",
}: {
  open: boolean;
  onClose: () => void;
  storeSlug: string;
  storeName: string;
  initialProduct?: ChatProductCard;
  initialThreadId?: string;
  /** Vendor dashboard opens existing threads; bubbles must align to the seller. */
  viewerRole?: "customer" | "vendor";
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-[1px] md:hidden"
        aria-label="Close chat"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed z-[100] flex flex-col overflow-hidden border border-border bg-white shadow-xl transition-all duration-300 dark:bg-slate-900",
          "max-md:inset-0 max-md:h-dvh max-md:w-full max-md:rounded-none",
          "md:bottom-4 md:right-4 md:h-[500px] md:w-80 md:rounded-2xl",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-popup-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-3">
          <div className="min-w-0">
            <h2 id="chat-popup-title" className="truncate text-sm font-semibold text-foreground">
              {storeName}
            </h2>
            <p className="text-xs text-muted-foreground">Chat with seller</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={onClose} aria-label="Close chat">
            <X className="size-5" />
          </Button>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
          <ChatRoom
            key={`${storeSlug}-${initialThreadId ?? "new"}`}
            storeSlug={storeSlug}
            initialProduct={initialProduct}
            initialThreadId={initialThreadId}
            viewerRole={viewerRole}
            variant="popup"
          />
        </div>
      </div>
    </>
  );
}
