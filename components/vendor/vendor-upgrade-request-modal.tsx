"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlanDefinitionRow } from "@/lib/platform-db";
import { apiFetch } from "@/lib/api-client";

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

type Props = {
  open: boolean;
  onClose: () => void;
  /** Pre-selected plan when opening from a pricing card */
  defaultPlanId: string;
  plans: PlanDefinitionRow[];
  storeName: string;
  phone: string;
  email: string;
  onSubmitted?: () => void;
};

export function VendorUpgradeRequestModal({
  open,
  onClose,
  defaultPlanId,
  plans,
  storeName,
  phone,
  email,
  onSubmitted,
}: Props) {
  const [planId, setPlanId] = useState(defaultPlanId);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPlanId(defaultPlanId);
      setMessage("");
      setError(null);
    }
  }, [open, defaultPlanId]);

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

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/vendor/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, message: message.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit request.");
        return;
      }
      const url = buildWhatsAppUrl();
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      onSubmitted?.();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-req-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground" id="upgrade-req-title">
          Request upgrade
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your request is saved for the admin team. An admin must approve before your plan changes.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ur-store">Store name</Label>
            <Input id="ur-store" readOnly className="rounded-xl bg-muted/50" value={storeName} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ur-email">Email</Label>
            <Input id="ur-email" readOnly className="rounded-xl bg-muted/50" value={email} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ur-phone">Phone</Label>
            <Input id="ur-phone" readOnly className="rounded-xl bg-muted/50" value={phone} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ur-plan">Plan requested</Label>
            <select
              id="ur-plan"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price_monthly_cents === 0 ? "Free" : `$${(p.price_monthly_cents / 100).toFixed(2)}/mo`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ur-msg">Message (optional)</Label>
            <Textarea
              id="ur-msg"
              className="min-h-[80px] rounded-xl"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything we should know?"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="rounded-xl" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          {tel ? (
            <Button type="button" variant="secondary" className="rounded-xl" asChild>
              <a href={tel}>Call admin</a>
            </Button>
          ) : null}
          <Button type="button" className="rounded-xl" disabled={submitting || !planId} onClick={() => void submit()}>
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
            Request is still recorded. Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_UPGRADE_WHATSAPP</code> to
            open WhatsApp after submit.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">After submit, WhatsApp opens with a pre-filled message.</p>
        )}
      </div>
    </div>
  );
}
