import type { ReactNode } from "react";
import { PageScaffold } from "@/components/page-scaffold";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <PageScaffold>
      <SiteHeader />
      {children}
      <SiteFooter />
    </PageScaffold>
  );
}
