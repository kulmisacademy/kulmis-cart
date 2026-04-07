"use client";

import { useRouter } from "next/navigation";
import { deferRouterAction } from "@/lib/next-router-safe";
import { useEffect, useState } from "react";
import { formatFollowerCount } from "@/lib/format-followers";
import { cn } from "@/lib/utils";

type Props = {
  storeSlug: string;
  /** Canonical path after login, e.g. `/store/my-shop-{uuid}`. */
  storeProfilePath: string;
  initialFollowerCount: number;
};

export function StoreFollowButton({ storeSlug, storeProfilePath, initialFollowerCount }: Props) {
  const router = useRouter();
  const [count, setCount] = useState(initialFollowerCount);
  const [following, setFollowing] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/customer/follow-status?storeSlug=${encodeURIComponent(storeSlug)}`,
          { credentials: "include" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          followerCount: number;
          following: boolean;
          authenticated: boolean;
        };
        setCount(data.followerCount);
        setFollowing(data.following);
        setAuthenticated(data.authenticated);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  async function onClick() {
    if (!authenticated) {
      router.push(`/auth?tab=customer&next=${encodeURIComponent(storeProfilePath)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/customer/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, follow: !following }),
      });
      const data = (await res.json()) as {
        followerCount?: number;
        following?: boolean;
        error?: string;
      };
      if (res.ok && data.followerCount != null && data.following != null) {
        setCount(data.followerCount);
        setFollowing(data.following);
        deferRouterAction(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  const compact = formatFollowerCount(count);
  const label = loading ? "…" : following ? "Following" : "Follow";

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy || loading}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60",
        following
          ? "border border-border bg-card text-foreground hover:bg-muted"
          : "bg-blue-600 text-white hover:bg-blue-700",
      )}
    >
      <span aria-hidden>❤️</span>
      <span>{label}</span>
      <span className="text-xs font-normal tabular-nums opacity-90">({compact} followers)</span>
    </button>
  );
}
