"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useTranslations } from "@/lib/locale-context";

export function SiteFooter() {
  const { t } = useTranslations();

  return (
    <footer className="mt-14 border-t border-border bg-muted py-10 text-muted-foreground transition-colors">
      <div className="mx-auto grid w-full max-w-brand gap-8 px-4 text-sm sm:px-6 md:grid-cols-4">
        <div>
          <BrandLogo href="/" size="lg" className="mb-1" />
          <p className="mt-3">{t("footer.tagline")}</p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-foreground">{t("footer.shop")}</p>
          <p>
            <Link href="/products" className="link-brand">
              {t("footer.products")}
            </Link>
          </p>
          <p>
            <Link href="/stores" className="link-brand">
              {t("footer.stores")}
            </Link>
          </p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-foreground">{t("footer.company")}</p>
          <p>{t("footer.contact")}</p>
          <p>{t("footer.privacy")}</p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-foreground">{t("footer.newsletter")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              suppressHydrationWarning
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              placeholder={t("footer.emailPlaceholder")}
            />
            <button
              type="button"
              className="btn-brand-accent w-full shrink-0 px-4 py-2 text-sm sm:w-auto"
              aria-label={t("footer.subscribe")}
            >
              {t("footer.subscribe")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
