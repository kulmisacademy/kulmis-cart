"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Store, Upload } from "lucide-react";
import { useTranslations } from "@/lib/locale-context";

/** Local asset: `ai.png` → `public/images/home/ai-product.png` */
const AI_SECTION_IMAGE_SRC = "/images/home/ai-product.png";

const STEPS = [
  { icon: Upload, i18nKey: "aiStep1" as const },
  { icon: Sparkles, i18nKey: "aiStep2" as const },
  { icon: Store, i18nKey: "aiStep3" as const },
];

export function AiProductSection() {
  const { t } = useTranslations();

  return (
    <section className="mx-auto w-full max-w-brand px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm ring-1 ring-border/60">
        <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-2 md:gap-10 md:p-8 lg:items-center">
          <div className="min-w-0 md:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">{t("home.aiEyebrow")}</p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("home.aiTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("home.aiDesc")}</p>

            <ol className="relative mt-8 space-y-0" aria-label={t("home.aiRoadmapLabel")}>
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

            <Link href="/auth?tab=store&mode=register" className="btn-brand-accent mt-8 inline-flex w-full justify-center sm:w-auto">
              {t("home.aiCta")}
            </Link>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 sm:aspect-[3/2] md:order-2">
            <Image
              src={AI_SECTION_IMAGE_SRC}
              alt={t("home.aiImageAlt")}
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 45vw"
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
