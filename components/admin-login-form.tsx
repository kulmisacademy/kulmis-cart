"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }
      window.location.assign("/admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form suppressHydrationWarning className="mx-auto mt-8 max-w-md space-y-4" onSubmit={onSubmit}>
      {error ? <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
