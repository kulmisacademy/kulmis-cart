"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanDefinitionRow } from "@/lib/platform-db";

export function AdminPlatformClient() {
  const [feeDollars, setFeeDollars] = useState("10");
  const [plans, setPlans] = useState<PlanDefinitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setMessage(null);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/admin/platform-settings"),
        fetch("/api/admin/plans"),
      ]);
      if (sRes.ok) {
        const s = (await sRes.json()) as { settings?: { verification_fee_cents: number } };
        if (s.settings) setFeeDollars(String(s.settings.verification_fee_cents / 100));
      }
      if (pRes.ok) {
        const p = (await pRes.json()) as { plans?: PlanDefinitionRow[] };
        if (p.plans) setPlans(p.plans);
      }
    } catch {
      setMessage("Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveFee() {
    const cents = Math.round(parseFloat(feeDollars || "0") * 100);
    if (Number.isNaN(cents) || cents < 0) {
      setMessage("Invalid fee.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verification_fee_cents: cents }),
      });
      if (!res.ok) {
        setMessage("Could not save (database required).");
        return;
      }
      setMessage("Verification fee saved.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePlan(planId: string, patch: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, ...patch }),
      });
      const data = (await res.json().catch(() => ({}))) as { plans?: PlanDefinitionRow[]; error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Update failed.");
        return;
      }
      if (data.plans) setPlans(data.plans);
      setMessage("Plan updated.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Store verification fee</h2>
        <p className="mt-1 text-sm text-muted-foreground">One-time fee vendors pay before admin review (USD).</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="fee">Amount (USD)</Label>
            <Input
              id="fee"
              type="number"
              min={0}
              step={0.01}
              className="w-40 rounded-xl"
              value={feeDollars}
              onChange={(e) => setFeeDollars(e.target.value)}
            />
          </div>
          <Button type="button" className="rounded-xl" disabled={saving} onClick={() => void saveFee()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save fee"}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Plans</h2>
        <div className="flex flex-col gap-6">
          {plans.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {p.name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">({p.slug})</span>
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.is_active}
                    onChange={(e) => void updatePlan(p.id, { is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Price / mo (USD)</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="rounded-xl"
                    defaultValue={p.price_monthly_cents / 100}
                    onBlur={(e) => {
                      const v = Math.round(parseFloat(e.target.value || "0") * 100);
                      if (!Number.isNaN(v) && v >= 0 && v !== p.price_monthly_cents) {
                        void updatePlan(p.id, { price_monthly_cents: v });
                      }
                    }}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Product cap (empty = ∞)</span>
                  <Input
                    type="number"
                    min={0}
                    className="rounded-xl"
                    defaultValue={p.product_limit ?? ""}
                    placeholder="Unlimited"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        void updatePlan(p.id, { product_limit: null });
                        return;
                      }
                      const val = parseInt(raw, 10);
                      if (!Number.isNaN(val) && val >= 0) {
                        void updatePlan(p.id, { product_limit: val });
                      }
                    }}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Video cap (empty = ∞)</span>
                  <Input
                    type="number"
                    min={0}
                    className="rounded-xl"
                    defaultValue={p.video_limit ?? ""}
                    placeholder="Unlimited"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        void updatePlan(p.id, { video_limit: null });
                        return;
                      }
                      const val = parseInt(raw, 10);
                      if (!Number.isNaN(val) && val >= 0) {
                        void updatePlan(p.id, { video_limit: val });
                      }
                    }}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.ai_enabled}
                    onChange={(e) => void updatePlan(p.id, { ai_enabled: e.target.checked })}
                  />
                  AI enabled
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">AI / day (empty = ∞)</span>
                  <Input
                    type="number"
                    min={0}
                    className="rounded-xl"
                    defaultValue={p.ai_per_day ?? ""}
                    placeholder="Unlimited"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        void updatePlan(p.id, { ai_per_day: null });
                        return;
                      }
                      const val = parseInt(raw, 10);
                      if (!Number.isNaN(val) && val >= 0) {
                        void updatePlan(p.id, { ai_per_day: val });
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plans — configure DATABASE_URL and run the app once.</p>
        ) : null}
      </section>
    </div>
  );
}
