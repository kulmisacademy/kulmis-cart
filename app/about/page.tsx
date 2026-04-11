import Link from "next/link";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About — LAAS24",
  description: "LAAS24 multi-vendor marketplace — shop stores, chat sellers, order on WhatsApp.",
};

export default function AboutPage() {
  return (
    <PageScaffold>
      <SiteHeader />
      <main className="mx-auto min-w-0 max-w-brand px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">About LAAS24</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
          LAAS24 is a multi-vendor marketplace built for Somalia and the diaspora. Discover products from verified
          stores, message sellers in real time, and complete orders through a checkout flow that connects you with
          sellers on WhatsApp.
        </p>
        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-brand-primary hover:underline">
          ← Back to home
        </Link>
      </main>
      <SiteFooter />
    </PageScaffold>
  );
}
