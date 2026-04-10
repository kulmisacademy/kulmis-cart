"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlanDefinitionRow } from "@/lib/platform-db";
import { apiFetch } from "@/lib/api-client";

export type PlanLimitKind = "product" | "video" | "ai";

type Props = {
  open: boolean;
  kind: PlanLimitKind;
  onClose: () => void;
  storeName: string;
  phone: string;
  email: string;
};

function waDigits(): string {
  const raw = process.env.NEXT_PUBLIC_UPGRADE_WHATSAPP?.trim() ?? "";
  return raw.replace(/\D/g, "");
}

function telHref(): string {
  const raw = process.env.NEXT_PUBLIC_UPGRADE_TEL?.trim() ?? "";
  if (!raw) return "";
  if (raw.startsWith("tel:")) return raw;
  return `tel:${raw.replace(/\s/g, "")}`;
}

export function PlanLimitModal({ open, kind, onClose, storeName, phone, email }: Props) {
  const [plans, setPlans] = useState<PlanDefinitionRow[]>([]);
  const [planId, setPlanId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/api/vendor/plans");
        const data = (await res.json()) as { plans?: PlanDefinitionRow[] };
        const list = (data.plans ?? []).filter((p) => p.slug !== "free");
        if (!cancelled) {
          setPlans(list);
          const paid = list.find((p) => p.slug === "pro") ?? list[0];
          setPlanId(paid?.id ?? "");
        }
      } catch {
        if (!cancelled) setPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const title = useMemo(() => {
    switch (kind) {
      case "product":
        return "You reached your product limit";
      case "video":
        return "You reached your video limit";
      case "ai":
        return "Daily AI limit reached";
      default:
        return "Plan limit reached";
    }
  }, [kind]);

  if (!open) return null;

  const digits = waDigits();
  const tel = telHref();

  function buildWhatsAppUrl(): string | null {
    if (!digits) return null;
    const planName = plans.find((p) => p.id === planId)?.name ?? "—";
    const msg = [
      "Upgrade request (LAAS24)",
      `Store: ${storeName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Requested plan: ${planName}`,
      message.trim() ? `Message: ${message.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  }

  async function submitRequest() {
    if (!planId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/vendor/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, message: message.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not submit request.");
        return;
      }
      const url = buildWhatsAppUrl();
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      onClose();
    } catch {
      setSubmitError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-limit-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400" id="plan-limit-title">
          ⚠️ {title}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Upgrade your plan to continue growing your store. Submit a request — an admin must approve before your plan
          changes.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pl-store">Store name</Label>
            <Input id="pl-store" readOnly className="rounded-xl bg-muted/50" value={storeName} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-email">Email</Label>
            <Input id="pl-email" readOnly className="rounded-xl bg-muted/50" value={email} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-phone">Phone</Label>
            <Input id="pl-phone" readOnly className="rounded-xl bg-muted/50" value={phone} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-plan">Selected plan</Label>
            <select
              id="pl-plan"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              {plans.length === 0 ? (
                <option value="">Loading plans…</option>
              ) : (
                plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-msg">Message (optional)</Label>
            <Textarea
              id="pl-msg"
              className="min-h-[80px] rounded-xl"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything we should know?"
            />
          </div>
        </div>

        {submitError ? <p className="mt-3 text-sm text-destructive">{submitError}</p> : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="rounded-xl" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          {tel ? (
            <Button type="button" variant="secondary" className="rounded-xl" asChild>
              <a href={tel}>Call admin</a>
            </Button>
          ) : null}
          <Button
            type="button"
            className="rounded-xl"
            disabled={submitting || !planId || plans.length === 0}
            onClick={() => void submitRequest()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit request"
            )}
          </Button>
        </div>
        {!digits ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Request is saved to the admin queue. Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_UPGRADE_WHATSAPP</code>{" "}
            to open WhatsApp after submit.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">After submit, WhatsApp opens with a pre-filled message.</p>
        )}
      </div>
    </div>
  );
}
