import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";
import { BrandLogo } from "@/components/brand-logo";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AdminLoginPage() {
  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-12 sm:px-6">
        <BrandLogo href={null} size="md" />
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Approve vendors and platform settings. Store owners sign in on{" "}
          <Link href="/auth?tab=store" className="font-medium text-brand-primary hover:underline">
            Vendor / Store auth
          </Link>
          .
        </p>
        <AdminLoginForm />
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
