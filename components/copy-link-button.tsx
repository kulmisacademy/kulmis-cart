"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { resolveUrlForBrowserClipboard } from "@/lib/site";

type Props = {
  url: string;
  label?: string;
  className?: string;
};

export function CopyLinkButton({ url, label = "Copy link", className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const toCopy = resolveUrlForBrowserClipboard(url);
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-muted ${className}`}
    >
      {/* Keep both icons mounted — swapping nodes caused insertBefore errors with React 19 / Next 16. */}
      <span className="relative inline-flex size-4 shrink-0 items-center justify-center" aria-hidden>
        <Copy
          size={16}
          className={`absolute transition-opacity duration-150 ${copied ? "opacity-0" : "opacity-100"}`}
        />
        <Check
          size={16}
          className={`absolute text-emerald-600 transition-opacity duration-150 ${copied ? "opacity-100" : "opacity-0"}`}
        />
      </span>
      <span>{copied ? "Copied!" : label}</span>
    </button>
  );
}
