"use client";

import Image from "next/image";
import { MessageCircle, Smartphone, Wallet } from "lucide-react";
import { useTranslations } from "@/lib/locale-context";

/** Local asset: `b1 (2).png` → `public/images/home/checkout-payment.png` */
const CHECKOUT_IMAGE_SRC = "/images/home/checkout-payment.png";

const STEPS = [
  { icon: Wallet, i18nKey: "checkoutB1" as const },
  { icon: MessageCircle, i18nKey: "checkoutB2" as const },
  { icon: Smartphone, i18nKey: "checkoutB3" as const },
];

export function CheckoutValueSection() {
  const { t } = useTranslations();

  return (
    <section className="mx-auto w-full max-w-brand px-4 py-5 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm ring-1 ring-border/60">
        <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-2 md:gap-10 md:p-8 lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">{t("home.checkoutEyebrow")}</p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("home.checkoutTitle")}
            </h2>

            <ol className="relative mt-8 space-y-0" aria-label={t("home.checkoutRoadmapLabel")}>
              {STEPS.map(({ icon: Icon, i18nKey }, index) => (
                <li key={i18nKey} className="relative flex gap-4 pb-8 last:pb-0">
                  {index < STEPS.length - 1 ? (
                    <span
                      className="absolute bottom-0 left-[1.125rem] top-11 w-px bg-gradient-to-b from-brand-primary/50 via-brand-secondary/35 to-transparent dark:from-brand-primary/45"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary/12 to-brand-secondary/10 text-brand-primary shadow-sm ring-2 ring-card dark:from-brand-primary/20 dark:ring-card">
                    <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.25} aria-hidden />
                  </div>
                  <p className="min-w-0 flex-1 pt-0.5 text-[15px] font-medium leading-relaxed text-foreground">
                    {t(`home.${i18nKey}`)}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 sm:aspect-[3/2]">
            <Image
              src={CHECKOUT_IMAGE_SRC}
              alt={t("home.checkoutImageAlt")}
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 45vw"
              priority={false}
              suppressHydrationWarning
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/25 via-transparent to-transparent dark:from-background/35"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}
