"use client";

import { useEffect, useState } from "react";
import { Store, User } from "lucide-react";
import { CustomerLoginForm } from "@/components/customer-login-form";
import { CustomerRegisterForm } from "@/components/customer-register-form";
import { LoginForm } from "@/components/login-form";
import { VendorRegistrationForm } from "@/components/vendor-registration-form";
import { cn } from "@/lib/utils";
import { rememberAuthTab, readStoredAuthTab, type AuthTab } from "@/lib/auth-routes";
import { sanitizeNextPath, vendorPostLoginPath } from "@/lib/internal-nav";

type Mode = "login" | "register";

type Props = {
  initialTab: AuthTab;
  initialMode: Mode;
  /** When true, `initialTab` came from ?tab= and should not be overridden by localStorage. */
  hasTabInUrl: boolean;
  nextPath: string | null | undefined;
  /** Set when redirected from /vendor (session missing or store record missing). */
  authReason?: "session" | "vendor";
};

function ModeToggle({
  mode,
  onMode,
  labels,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  labels: { login: string; register: string };
}) {
  return (
    <div className="flex w-full rounded-full bg-muted/80 p-1 dark:bg-slate-800/90">
      <button
        type="button"
        onClick={() => onMode("login")}
        className={cn(
          "min-h-11 flex-1 rounded-full px-3 text-center text-sm font-semibold transition-all duration-200",
          mode === "login"
            ? "bg-brand-primary text-white shadow-sm dark:bg-brand-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {labels.login}
      </button>
      <button
        type="button"
        onClick={() => onMode("register")}
        className={cn(
          "min-h-11 flex-1 rounded-full px-3 text-center text-sm font-semibold transition-all duration-200",
          mode === "register"
            ? "bg-brand-primary text-white shadow-sm dark:bg-brand-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {labels.register}
      </button>
    </div>
  );
}

const REASON_COPY: Record<"session" | "vendor", string> = {
  session:
    "We could not verify your store session (cookie missing or expired). Sign in below with your vendor email and password.",
  vendor:
    "Your login cookie is valid, but we could not find your store profile. Try signing in again, or register if you have not opened a store yet.",
};

export function AuthPageClient({ initialTab, initialMode, hasTabInUrl, nextPath, authReason }: Props) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [mounted, setMounted] = useState(false);
  const [dismissReason, setDismissReason] = useState(false);

  const customerNext = sanitizeNextPath(nextPath, "/account");
  const vendorNext = vendorPostLoginPath(nextPath);

  useEffect(() => {
    setMounted(true);
    if (!hasTabInUrl) {
      const stored = readStoredAuthTab();
      if (stored) setTab(stored);
    }
  }, [hasTabInUrl]);

  function selectTab(next: AuthTab) {
    setTab(next);
    rememberAuthTab(next);
  }

  const showReasonBanner = authReason && !dismissReason;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Sign in or join</h1>
        <p className="mt-2 text-sm text-muted-foreground">One place for shoppers and store owners.</p>
      </div>

      {showReasonBanner ? (
        <div
          className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <div className="flex gap-3">
            <p className="min-w-0 flex-1 leading-relaxed">{authReason ? REASON_COPY[authReason] : null}</p>
            <button
              type="button"
              className="shrink-0 text-amber-900/80 underline hover:text-amber-950 dark:text-amber-200/90"
              onClick={() => setDismissReason(true)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="mb-6 flex justify-center"
        role="tablist"
        aria-label="Account type"
        suppressHydrationWarning
      >
        <div className="flex w-full max-w-sm rounded-full bg-muted/80 p-1 dark:bg-slate-800/90 sm:w-fit">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "customer"}
            onClick={() => selectTab("customer")}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 sm:flex-initial",
              tab === "customer"
                ? "bg-brand-primary text-white shadow-sm dark:bg-brand-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="size-4 shrink-0" aria-hidden />
            Customer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "store"}
            onClick={() => selectTab("store")}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 sm:flex-initial",
              tab === "store"
                ? "bg-brand-primary text-white shadow-sm dark:bg-brand-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Store className="size-4 shrink-0" aria-hidden />
            Store
          </button>
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-black/30",
          "transition-opacity duration-200",
          mounted ? "opacity-100" : "opacity-95",
        )}
      >
        {tab === "customer" ? (
          <div className="space-y-5" key="customer">
            <ModeToggle
              mode={mode}
              onMode={setMode}
              labels={{ login: "Log in", register: "Create account" }}
            />
            <div className="min-h-[280px]">
              {mode === "login" ? (
                <CustomerLoginForm
                  nextPath={customerNext}
                  embedded
                  onSwitchToRegister={() => setMode("register")}
                />
              ) : (
                <CustomerRegisterForm
                  nextPath={customerNext}
                  embedded
                  onSwitchToLogin={() => setMode("login")}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5" key="store">
            <ModeToggle
              mode={mode}
              onMode={setMode}
              labels={{ login: "Log in", register: "Open your store" }}
            />
            <div className="max-h-[min(70vh,640px)] overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
              {mode === "login" ? (
                <div className="space-y-4 pt-1">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Vendor login</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use the email and password you registered your store with.
                    </p>
                  </div>
                  <LoginForm nextPath={vendorNext} />
                  <p className="text-center text-sm text-muted-foreground">
                    New store?{" "}
                    <button
                      type="button"
                      className="font-semibold text-brand-primary hover:underline"
                      onClick={() => setMode("register")}
                    >
                      Register your store
                    </button>
                  </p>
                </div>
              ) : (
                <VendorRegistrationForm />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
