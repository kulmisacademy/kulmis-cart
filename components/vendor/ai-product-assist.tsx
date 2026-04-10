"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

type Draft = { title: string; description: string; features: string };

type Props = {
  onApply: (draft: Draft) => void;
  disabled?: boolean;
  /** When API returns daily AI limit or disabled AI, show upgrade flow instead of raw error. */
  onPlanLimit?: () => void;
};

export function AiProductAssist({ onApply, disabled, onPlanLimit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("image", file);
      const res = await apiFetch("/api/ai/analyze-product-image", { method: "POST", body: fd });
      const data = (await res.json()) as {
        title?: string;
        description?: string;
        features?: string[];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if ((data.code === "AI_DAILY_LIMIT" || data.code === "AI_DISABLED") && onPlanLimit) {
          onPlanLimit();
          return;
        }
        throw new Error(data.error ?? "Could not analyze image");
      }
      const title = typeof data.title === "string" ? data.title : "";
      const description = typeof data.description === "string" ? data.description : "";
      const features = Array.isArray(data.features) ? data.features.join("\n") : "";
      onApply({ title, description, features });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">AI mode</p>
          <p className="text-xs text-muted-foreground">
            Upload one clear product photo. You can edit all fields before saving.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => void onFileChange(e)}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            <Sparkles className="size-4 text-brand-primary" aria-hidden />
            {busy ? "Working…" : "Upload photo for AI"}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
