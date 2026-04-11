"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { supportWhatsAppHref } from "@/lib/marketing-contact";

function showOnPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/vendor")) return false;
  if (pathname.startsWith("/admin")) return false;
  return true;
}

/** Fixed WhatsApp CTA — sits above the mobile bottom nav on small screens. */
export function FloatingWhatsAppSupport() {
  const pathname = usePathname();
  if (!showOnPath(pathname)) return null;

  return (
    <a
      href={supportWhatsAppHref()}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 z-[45] flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg ring-2 ring-white/20 transition hover:scale-[1.03] hover:bg-[#20bd5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-8"
      aria-label="WhatsApp"
    >
      <MessageCircle className="size-7" strokeWidth={2.25} aria-hidden />
    </a>
  );
}
