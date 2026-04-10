"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          accessKey: accessKey.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form suppressHydrationWarning className="mx-auto mt-8 max-w-md space-y-4" onSubmit={onSubmit}>
      {error ? <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        <label htmlFor="admin-access-key" className="text-sm font-medium text-foreground">
          Admin access key
        </label>
        <Input
          id="admin-access-key"
          type="password"
          autoComplete="off"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
          className="rounded-xl"
          placeholder="Required when set in server environment"
        />
        <p className="text-xs text-muted-foreground">Leave blank if your deployment does not use ADMIN_ACCESS_KEY.</p>
      </div>
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
