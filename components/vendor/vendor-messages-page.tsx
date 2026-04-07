"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { ChatPopup } from "@/components/chat-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/locale-context";
import { useVendorDashboard } from "./vendor-dashboard-provider";

export function VendorMessagesPage() {
  const { t } = useTranslations();
  const { state, vendor } = useVendorDashboard();
  const phone = state.settings.whatsAppNumber || state.settings.phone;
  const digits = phone.replace(/\D/g, "");
  const href = digits ? `https://wa.me/${digits}` : "#";
  const [threads, setThreads] = useState<
    Array<{
      id: string;
      customerName: string;
      storeSlug: string;
      storeName?: string;
      updatedAt: string;
      lastMessage: string | null;
    }>
  >([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/chat/threads?role=vendor", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        threads?: Array<{
          id: string;
          customerName: string;
          storeSlug: string;
          storeName?: string;
          updatedAt: string;
          lastMessage: string | null;
        }>;
      };
      if (res.ok && data.threads) setThreads(data.threads);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.messages.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("vendor.messages.body")}</p>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">{t("vendor.messages.preview")}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex shrink-0 items-center gap-2">
              <MessageCircle className="size-5 shrink-0 text-brand-secondary" aria-hidden />
              <span className="text-base font-semibold text-foreground">WhatsApp</span>
            </div>
            <Input
              readOnly
              type="tel"
              value={phone || ""}
              placeholder="—"
              aria-label={t("vendor.settings.fields.whatsapp")}
              className="min-h-11 min-w-0 flex-1 font-mono text-sm"
            />
            {digits ? (
              <Button type="button" className="h-11 shrink-0 rounded-xl whitespace-nowrap sm:min-w-[12rem]" asChild>
                <a href={href} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <MessageCircle className="size-4 shrink-0" />
                  {t("vendor.messages.whatsappCta")}
                </a>
              </Button>
            ) : (
              <Button type="button" className="h-11 shrink-0 rounded-xl whitespace-nowrap sm:min-w-[12rem]" disabled>
                <MessageCircle className="size-4 shrink-0" />
                {t("vendor.messages.whatsappCta")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("vendor.analytics.hint")}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">In-app chat</CardTitle>
        </CardHeader>
        <CardContent>
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chats yet. Customers can start from product page.</p>
          ) : (
            <ul className="space-y-3">
              {threads.map((th) => (
                <li key={th.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{th.customerName}</p>
                      <p className="text-xs text-muted-foreground">{th.lastMessage ?? "Open chat"}</p>
                    </div>
                    <Button type="button" size="sm" className="rounded-lg" onClick={() => setActiveThreadId(th.id)}>
                      Open chat
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ChatPopup
        open={activeThreadId != null}
        onClose={() => setActiveThreadId(null)}
        storeSlug={vendor.storeSlug}
        storeName={state.settings.storeName?.trim() || vendor.storeName}
        initialThreadId={activeThreadId ?? undefined}
        viewerRole="vendor"
      />
    </div>
  );
}
