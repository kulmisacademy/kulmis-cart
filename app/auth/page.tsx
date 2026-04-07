import { Suspense } from "react";
import { AuthPageClient } from "@/components/auth-page-client";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AuthTab } from "@/lib/auth-routes";

type Sp = { tab?: string; mode?: string; next?: string; reason?: string };

export default async function AuthPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const hasTabInUrl = sp.tab === "store" || sp.tab === "customer";
  const initialTab: AuthTab = sp.tab === "store" ? "store" : "customer";
  const initialMode = sp.mode === "register" ? "register" : "login";
  const nextPath =
    sp.next?.trim() && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next.trim() : undefined;
  const authReason =
    sp.reason === "session" || sp.reason === "vendor" ? sp.reason : undefined;

  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-brand px-4 py-8 sm:px-6 sm:py-12">
        <Suspense
          fallback={
            <p className="text-center text-sm text-muted-foreground" suppressHydrationWarning>
              Loading…
            </p>
          }
        >
          <AuthPageClient
            initialTab={initialTab}
            initialMode={initialMode}
            hasTabInUrl={hasTabInUrl}
            nextPath={nextPath}
            authReason={authReason}
          />
        </Suspense>
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
