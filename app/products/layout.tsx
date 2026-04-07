import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageScaffold>
      <SiteHeader />
      {children}
      <SiteFooter />
    </PageScaffold>
  );
}
