"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function VendorVerificationSettings() {
  const [feeCents, setFeeCents] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch("/api/vendor/verification-request");
      if (!res.ok) return;
      const data = (await res.json()) as { verificationFeeCents?: number; isVerified?: boolean };
      if (typeof data.verificationFeeCents === "number") setFeeCents(data.verificationFeeCents);
      if (typeof data.isVerified === "boolean") setVerified(data.isVerified);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function requestVerification() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiFetch("/api/vendor/verification-request", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Request failed.");
        return;
      }
      setMessage("Request submitted. Complete payment and wait for admin approval.");
    } catch {
      setMessage("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </p>
    );
  }

  const feeUsd = feeCents != null ? (feeCents / 100).toFixed(2) : "—";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Store verification</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Get a verified badge on your storefront to build trust. One-time fee set by the platform.
      </p>
      {verified ? (
        <p className="mt-4 inline-flex items-center rounded-full bg-green-500/15 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-300">
          Verified
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm">
            Current verification fee: <span className="font-semibold text-foreground">${feeUsd} USD</span>
          </p>
          <Button
            type="button"
            className="mt-4 rounded-xl"
            disabled={submitting}
            onClick={() => void requestVerification()}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Request verification"}
          </Button>
        </>
      )}
      {message ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
