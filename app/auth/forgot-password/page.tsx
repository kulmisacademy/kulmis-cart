import Link from "next/link";
import { ForgotPasswordClient } from "@/components/forgot-password-client";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AuthTab } from "@/lib/auth-routes";

type Sp = { tab?: string };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const initialTab: AuthTab = sp.tab === "store" ? "store" : "customer";

  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-brand px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 text-center">
          <Link href="/auth" className="text-sm font-medium text-brand-primary hover:underline">
            ← Back to sign in
          </Link>
        </div>
        <ForgotPasswordClient initialTab={initialTab} />
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
