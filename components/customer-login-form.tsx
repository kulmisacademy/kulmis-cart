"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerPostLoginPath } from "@/lib/internal-nav";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  nextPath: string;
  /** Hide outer card + swap register link for in-page control (unified /auth). */
  embedded?: boolean;
  onSwitchToRegister?: () => void;
};

export function CustomerLoginForm({ nextPath, embedded, onSwitchToRegister }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    form.clearErrors("root");
    const payload = {
      email: values.email.trim().toLowerCase(),
      password: values.password,
    };
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        form.setError("root", {
          message: data.error ?? "Sign-in failed. Check your email and password, or create a customer account.",
        });
        return;
      }
      const dest = customerPostLoginPath(nextPath);
      // Full navigation so the httpOnly session cookie is always sent on the next document request
      // (same pattern as vendor login; avoids client-router timing with Set-Cookie).
      window.location.assign(dest);
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "Failed to fetch"
          ? "Could not reach the server. If you use a privacy or ad-blocking extension, try disabling it for localhost or retry."
          : e instanceof Error
            ? e.message
            : "Network error. Try again.";
      form.setError("root", { message: msg });
    }
  }

  const shell = embedded
    ? "space-y-4"
    : "mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm";

  return (
    <form suppressHydrationWarning onSubmit={form.handleSubmit(onSubmit)} className={shell}>
      <div>
        <h2 className={embedded ? "text-lg font-semibold text-foreground" : "text-2xl font-bold text-foreground"}>
          {embedded ? "Welcome back" : "Customer login"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to place orders and view your history.{" "}
          {onSwitchToRegister ? (
            <>
              New here?{" "}
              <button
                type="button"
                className="font-medium text-brand-primary hover:underline"
                onClick={onSwitchToRegister}
              >
                Create an account
              </button>
              .
            </>
          ) : (
            <>
              New here?{" "}
              <Link
                href={`/auth?tab=customer&mode=register&next=${encodeURIComponent(nextPath)}`}
                className="font-medium text-brand-primary hover:underline"
              >
                Create an account
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {form.formState.errors.root?.message ? (
        <p
          className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
          aria-live="polite"
        >
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          className="h-12 rounded-lg px-3 py-3 text-base sm:h-11 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-sm"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          className="h-12 rounded-lg px-3 py-3 text-base sm:h-11 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-sm"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <p className="text-center text-sm">
        <Link href="/auth/forgot-password?tab=customer" className="font-medium text-brand-primary hover:underline">
          Forgot password?
        </Link>
      </p>

      <Button
        type="submit"
        className="h-12 w-full rounded-lg text-base font-semibold sm:h-11 sm:rounded-xl sm:text-sm"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}
