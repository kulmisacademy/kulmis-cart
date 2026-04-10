"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AuthTab } from "@/lib/auth-routes";
import { apiFetch } from "@/lib/api-client";

type Step = "email" | "otp" | "password";

type Props = { initialTab: AuthTab };

export function ForgotPasswordClient({ initialTab }: Props) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    setStep("email");
    setError(null);
    setOtp("");
    setResetToken("");
    setPassword("");
    setConfirm("");
  }, [initialTab]);

  const role = tab === "store" ? "vendor" : "customer";

  const tabHref = useMemo(
    () => (t: AuthTab) => `/auth/forgot-password?tab=${t === "store" ? "store" : "customer"}`,
    [],
  );

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send code. Check email settings or try again.");
        return;
      }
      setStep("otp");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          otp: otp.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; resetToken?: string };
      if (!res.ok || !data.resetToken) {
        setError(data.error ?? "Invalid or expired code.");
        return;
      }
      setResetToken(data.resetToken);
      setStep("password");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not reset password.");
        return;
      }
      const dest = data.redirect ?? (role === "vendor" ? "/vendor" : "/account");
      window.location.assign(dest);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Reset password
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {step === "email" && "We’ll email you a short code to verify it’s you."}
        {step === "otp" && "Enter the 6-digit code (valid for 10 minutes)."}
        {step === "password" && "Choose a new password for your account."}
      </p>

      <div className="mt-6 flex justify-center gap-1 rounded-full bg-muted/80 p-1 dark:bg-slate-800/90">
        <Link
          href={tabHref("customer")}
          onClick={() => {
            setTab("customer");
            setStep("email");
            setError(null);
          }}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold sm:flex-initial",
            tab === "customer"
              ? "bg-brand-primary text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="size-4" aria-hidden />
          Customer
        </Link>
        <Link
          href={tabHref("store")}
          onClick={() => {
            setTab("store");
            setStep("email");
            setError(null);
          }}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold sm:flex-initial",
            tab === "store" ? "bg-brand-primary text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Store className="size-4" aria-hidden />
          Store
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-lg dark:bg-slate-900">
        {error ? (
          <p
            className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Code sent to <span className="font-medium text-foreground">{email}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="fp-otp">Verification code</Label>
              <Input
                id="fp-otp"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="font-mono text-lg tracking-widest"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking…" : "Verify code"}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground underline hover:text-foreground"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        ) : null}

        {step === "password" ? (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-pw">New password</Label>
              <Input
                id="fp-pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-pw2">Confirm password</Label>
              <Input
                id="fp-pw2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Update password & sign in"}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
