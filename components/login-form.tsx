"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/locale-context";
import { vendorPostLoginPath } from "@/lib/internal-nav";

type LoginFormProps = {
  /** Post-login path (e.g. from /auth unified page). */
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const { t } = useTranslations();
  const dest = vendorPostLoginPath(nextPath);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      });
      const text = await res.text();
      let data: { error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text) as { error?: string };
        } catch {
          /* non-JSON error body */
        }
      }
      if (!res.ok) {
        const fallback = t("vendor.login.error");
        let msg = typeof data.error === "string" ? data.error.trim() : "";
        if (!msg && text) {
          const ct = res.headers.get("content-type") ?? "";
          const looksJson = ct.includes("application/json") || text.trim().startsWith("{");
          const looksHtml = /<\s*!DOCTYPE/i.test(text) || /<\s*html/i.test(text);
          if (!looksJson && !looksHtml && text.trim().length > 0) {
            msg = text.trim().slice(0, 280);
          }
        }
        setError(msg || fallback || "Sign in failed");
        return;
      }
      // Full navigation so the httpOnly session cookie is always sent on the next document request
      // (avoids rare client-router cases where /vendor loads before the cookie is visible).
      window.location.assign(dest);
    } catch (err) {
      const fallback = t("vendor.login.error");
      const net =
        err instanceof Error
          ? err.message
          : "Could not reach the server. Check your connection and try again.";
      setError(net || fallback || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form suppressHydrationWarning className="mt-8 space-y-5" onSubmit={onSubmit}>
      {error ? (
        <p
          ref={errorRef}
          className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className="h-12 rounded-lg px-3 py-3 text-base sm:h-11 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="login-password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="h-12 rounded-lg px-3 py-3 text-base sm:h-11 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <p className="text-center text-sm">
        <Link href="/auth/forgot-password?tab=store" className="font-medium text-brand-primary hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="text-xs text-muted-foreground">
        After you register, your store is active immediately — sign in here with the same email and password.
      </p>
      <Button
        type="submit"
        className="mt-2 h-12 w-full rounded-lg text-base font-semibold shadow-sm sm:h-11 sm:rounded-xl"
        disabled={loading}
      >
        {loading ? t("vendor.login.loading") : "Login"}
      </Button>
    </form>
  );
}
