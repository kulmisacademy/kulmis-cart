"use client";

import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { getSupportEmail, supportMailtoHref, supportWhatsAppHref } from "@/lib/marketing-contact";
import { useTranslations } from "@/lib/locale-context";

export function SiteFooter() {
  const { t } = useTranslations();
  const email = getSupportEmail();

  return (
    <footer className="mt-14 border-t border-slate-800 bg-slate-950 py-10 text-slate-300 transition-colors">
      <div className="mx-auto grid w-full max-w-brand gap-10 px-6 text-sm md:grid-cols-3 md:gap-8">
        <div className="min-w-0 space-y-4">
          <BrandLogo href="/" size="lg" markId="footer-logo" />
          <p className="max-w-sm leading-relaxed text-slate-400">{t("footer.tagline")}</p>
        </div>

        <div>
          <p className="mb-4 font-semibold text-white">{t("footer.shop")}</p>
          <ul className="space-y-3">
            <li>
              <Link href="/products" className="text-slate-300 transition hover:text-emerald-400">
                {t("footer.products")}
              </Link>
            </li>
            <li>
              <Link href="/stores" className="text-slate-300 transition hover:text-emerald-400">
                {t("footer.stores")}
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-slate-300 transition hover:text-emerald-400">
                {t("footer.about")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 font-semibold text-white">{t("footer.contactHeading")}</p>
          <ul className="space-y-4">
            <li>
              <a
                href={supportWhatsAppHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-slate-300 transition hover:text-emerald-400"
              >
                <MessageCircle className="size-4 shrink-0 text-[#25D366]" aria-hidden />
                <span className="break-all">{t("footer.whatsappLabel")}</span>
              </a>
            </li>
            <li>
              <a
                href={supportMailtoHref()}
                className="inline-flex items-center gap-2 text-slate-300 transition hover:text-emerald-400"
              >
                <Mail className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="break-all">{email}</span>
              </a>
            </li>
          </ul>
          <p className="mt-6 text-xs text-slate-500">{t("footer.privacy")}</p>
        </div>
      </div>
    </footer>
  );
}
